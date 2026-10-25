import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  getCountFromServer,
  setDoc,
  serverTimestamp,
  deleteField
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================================================
   LEADERBOARD — STAGE 1 (read-optimised) + STAGE 2 (brake step + cache)
   -------------------------------------------------------------------------
   BEFORE (measured on main @ 085b811):
     getDocs(collection("users"))                    -> 1 read per user
     + getDoc(users/{uid}/lessons/{lessonId})        -> 1 read per user
     = 2 x N reads per render   (400 reads at N = 200)

   STAGE 1 (already on main):
     query(leaderboard/{lessonId}/entries,
           orderBy score desc, orderBy updatedAt asc, limit(10))  -> 10 reads
     + getCountFromServer(score > myScore)
           ONLY when the current user is not in the returned top 10
                                                                  ->  1 read
     = 10 reads (user inside top 10) or 11 reads (user outside)

   STAGE 2 (this change) — THE BRAKE STEP + IN-MEMORY CACHE
     The 10-11 reads above used to fire the moment the tab opened, even if
     the student never wanted that lesson's board. Now:
       * entering the tab renders a PROMPT, not a query  -> 0 reads
       * the two filters start UNSELECTED (placeholder options)
       * a "Xem" button releases the brake -> the 10-11 reads happen
       * the result is cached IN MEMORY, keyed by lessonId, so returning to
         the tab re-renders the SAME board with 0 reads
       * "Làm mới" forces a fresh read
       * saveLeaderboardEntry() INVALIDATES the cache for its lessonId, so a
         student who just finished a lesson always sees their new rank

   WHY IN-MEMORY AND NOT localStorage
     router.js only does fetch() + innerHTML, so a module-level Map SURVIVES
     tab switches (measured: a window probe set before leaving the tab was
     still readable on return). localStorage would also survive, but it
     writes student names/scores to disk on a SHARED classroom machine, where
     the next student could read them. The Map never touches disk.

   WHY THE CACHE STORES DATA, NOT HTML
     Measured: the tab's DOM IS destroyed when you leave the tab (the
     #leaderboardList node no longer exists on return), while the module
     scope survives. So the cache holds {top10, me} and re-renders.

   IMPORT FIX (this change)
     `getDocs` was USED at the old line 312 but was MISSING from the import
     list. It only resolved because home.html does `window.getDocs = getDocs`
     (home.html:876) and an unresolved identifier falls back to the global
     object. On lesson.html that global is never set, so the module was one
     call away from a ReferenceError. It is now imported properly.

   SOURCE OF TRUTH (UNCHANGED)
     users/{uid}                        -> still authoritative
     users/{uid}/lessons/{lessonId}     -> still authoritative
     leaderboard/{lessonId}/entries/{uid} is a READ-ONLY MIRROR, written by
     window.saveLeaderboardEntry() which lessonEngine calls from
     saveCloudProgress().

   DOM CONTRACT (UNCHANGED)
     #topicFilter, #lessonFilter, #leaderboardList, .lb-row, .lb-rank,
     .lb-name, .lb-score, .lb-badge, .lb-loading, .lb-separator, .lb-me,
     .lb-gold, .lb-silver, .lb-bronze
   DOM CONTRACT (ADDED by stage 2)
     #viewLeaderboardBtn, #refreshLeaderboardBtn, .lb-view, .lb-refresh,
     .lb-prompt
   ========================================================================= */

window.lessonMap = {};

COURSE_CONFIG.forEach(topic=>{

  lessonMap[topic.id] =

    topic.lessons.map(
      lesson=>({

        id:lesson.id,

        name:lesson.name

      })
    );

});

/* =========================================================================
   STAGE-2 STATE
   -------------------------------------------------------------------------
   lbCache      : lessonId -> { top10, me, ts }   (DATA, never HTML)
   lbSelected*  : the student's filter choice, kept in MODULE scope so it
                  survives the tab's DOM being destroyed and rebuilt.
   lbLoading    : re-entrancy guard for the "Xem" / "Làm mới" buttons.
   ========================================================================= */

const lbCache = new Map();

/* Bounded so a long session cannot grow the Map without limit. 20 lessons
   is far more than a student visits in one sitting. */
const LB_CACHE_MAX = 20;

let lbSelectedTopic = "";
let lbSelectedLesson = "";
let lbLoading = false;

/* -------------------------------------------------------------------------
   REFRESH COOLDOWN  (STAGE 2.1)
   -------------------------------------------------------------------------
   lbRefreshUntil : epoch ms at which the "Lam moi" button unlocks again.
                    ONE value for the WHOLE page - deliberately NOT keyed by
                    lessonId. Refreshing lesson A must also block lesson B,
                    otherwise a student just hops between lessons to keep
                    hammering the button.
   lbRefreshTimer : the 1s countdown interval, or null when idle.

   Why this exists: refreshLeaderboard() deletes the cache entry and then
   calls fetchAndRender(), so EVERY click is a real 10-11 document read.
   lbLoading only blocks clicks that land while a request is in flight
   (it is reset in `finally`), so it is a re-entrancy guard, NOT a rate
   limit. Without a cooldown a single student can burn ~3,300 reads in
   five minutes of clicking.

   In-memory only, consistent with lbCache: an F5 resets the cooldown.
   That is an accepted trade-off - a reload is a deliberate act, not spam.
   ========================================================================= */

const LB_REFRESH_COOLDOWN_MS = 60000;

let lbRefreshUntil = 0;
let lbRefreshTimer = null;

/* =========================
   LOAD TOPICS
========================= */

window.loadTopics =
function(){

  const topicSelect =

    document.getElementById(
      "topicFilter"
    );

  if(!topicSelect) return;

  topicSelect.innerHTML = `

    <option value="">
      -- Chọn chủ đề --
    </option>

  `;

  COURSE_CONFIG.forEach(topic=>{

    topicSelect.innerHTML += `

      <option
        value="${topic.id}"
      >

        ${topic.title}

      </option>

    `;

  });

  /* Restore the student's previous choice (the DOM was rebuilt, the module
     scope was not). An unknown/stale id falls back to the placeholder. */
  if(
    lbSelectedTopic &&
    window.lessonMap[lbSelectedTopic]
  ){
    topicSelect.value = lbSelectedTopic;
  }else{
    lbSelectedTopic = "";
    topicSelect.value = "";
  }

}

/* =========================
   LOAD LESSONS
=========================
   NOTE: this function NO LONGER calls loadLeaderboard(). That call was the
   reason the board re-rendered (and re-read) on every tab entry, and the
   reason the filter snapped back to the first lesson. Releasing the brake is
   now the student's explicit action ("Xem").
*/

window.loadLessons = function(){

  const topicSelect =
    document.getElementById(
      "topicFilter"
    );

  const lessonSelect =
    document.getElementById(
      "lessonFilter"
    );

  if(!lessonSelect) return;

  const topic =
    (topicSelect && topicSelect.value) ||
    lbSelectedTopic ||
    "";

  lbSelectedTopic = topic;

  lessonSelect.innerHTML = "";

  /* No topic chosen yet -> the lesson filter stays inert. */
  if(!topic || !window.lessonMap[topic]){

    lessonSelect.innerHTML = `

      <option value="">
        -- Chọn bài học --
      </option>

    `;

    lessonSelect.disabled = true;

    lbSelectedLesson = "";

    updateViewButton();

    showLeaderboardPrompt();

    return;
  }

  lessonSelect.disabled = false;

  lessonSelect.innerHTML = `

    <option value="">
      -- Chọn bài học --
    </option>

  `;

  const lessons =
    window.lessonMap[topic];

  lessons.forEach(lesson=>{

    lessonSelect.innerHTML += `

      <option value="${lesson.id}">
        ${lesson.name}
      </option>

    `;

  });

  /* Restore the previous lesson only if it still belongs to this topic. */
  if(
    lbSelectedLesson &&
    lessons.some(l=>l.id === lbSelectedLesson)
  ){
    lessonSelect.value = lbSelectedLesson;
  }else{
    lbSelectedLesson = "";
    lessonSelect.value = "";
  }

  updateViewButton();

  /* Re-apply the cooldown to the freshly rebuilt button. The DOM was
     destroyed on tab leave, so the countdown has to be re-attached; the
     remaining time itself lives in module scope and is preserved. */
  updateRefreshButton();

  /* Returning to the tab with a choice already made: re-render from cache
     (0 reads) or fall back to the prompt. Never auto-query. */
  restoreLeaderboardView();

}

/* =========================
   FILTER EVENTS
========================= */

window.onTopicChange =
function(){

  const topicSelect =
    document.getElementById(
      "topicFilter"
    );

  lbSelectedTopic =
    topicSelect ? topicSelect.value : "";

  /* A new topic invalidates the lesson choice. */
  lbSelectedLesson = "";

  loadLessons();

}

window.onLessonChange =
function(){

  const lessonSelect =
    document.getElementById(
      "lessonFilter"
    );

  lbSelectedLesson =
    lessonSelect ? lessonSelect.value : "";

  updateViewButton();

}

/* =========================
   VIEW BUTTON STATE
========================= */

window.updateViewButton =
function(){

  const btn =
    document.getElementById(
      "viewLeaderboardBtn"
    );

  if(!btn) return;

  const topicSelect =
    document.getElementById(
      "topicFilter"
    );

  const lessonSelect =
    document.getElementById(
      "lessonFilter"
    );

  const topic =
    topicSelect ? topicSelect.value : "";

  const lesson =
    lessonSelect ? lessonSelect.value : "";

  btn.disabled = !(topic && lesson);

}

/* =========================
   REFRESH BUTTON STATE + COUNTDOWN
=========================
   Renders the cooldown onto #refreshLeaderboardBtn: disabled + a live
   "Lam moi (45s)" label so the student understands WHY the button is
   inert, instead of assuming it is broken.

   Self-healing interval: router.js replaces #spaContainer on every tab
   change and exposes no cleanup hook, so the countdown cannot rely on
   being told the tab is gone. Instead it checks for its own button and
   clears itself the moment the button no longer exists - no interval
   outlives the DOM it belongs to.
*/

function updateRefreshButton(){

  const btn =
    document.getElementById(
      "refreshLeaderboardBtn"
    );

  if(!btn){

    /* Tab left: stop the countdown. lbRefreshUntil is kept, so returning
       to the tab resumes the remaining time instead of resetting it. */
    if(lbRefreshTimer){
      clearInterval(lbRefreshTimer);
      lbRefreshTimer = null;
    }
    return;

  }

  /* Remember the authored label once, so the HTML stays the source of
     truth for the button text. */
  if(!btn.dataset.lbLabel){
    btn.dataset.lbLabel =
      (btn.textContent || "").trim() || "L\u00e0m m\u1edbi";
  }

  const label = btn.dataset.lbLabel;

  const remaining =
    lbRefreshUntil - Date.now();

  if(remaining > 0){

    btn.disabled = true;

    btn.textContent =
      label + " (" + Math.ceil(remaining / 1000) + "s)";

    if(!lbRefreshTimer){
      lbRefreshTimer =
        setInterval(updateRefreshButton, 1000);
    }

  }else{

    btn.disabled = false;

    btn.textContent = label;

    if(lbRefreshTimer){
      clearInterval(lbRefreshTimer);
      lbRefreshTimer = null;
    }

  }

}

window.updateRefreshButton = updateRefreshButton;

/* =========================
   PROMPT (the brake, at rest)
========================= */

window.showLeaderboardPrompt =
function(){

  const container =
    document.getElementById(
      "leaderboardList"
    );

  if(!container) return;

  container.innerHTML = `

    <div class="lb-loading lb-prompt">
      Vui lòng chọn Chủ đề và Bài học muốn xem
    </div>

  `;

}

/* =========================================================================
   STAGE-1 HELPERS
   ========================================================================= */

/* The NAME is DENORMALISED into the mirror document so that rendering the
   leaderboard never has to read users/{uid} again (that per-user read was
   the N+1 half of the old 2 x N cost).

   THE AVATAR IS NO LONGER MIRRORED - see the write in
   saveLeaderboardEntry() below for the measurements and the reasoning. */
function resolveMyName(){
  try{
    const ud =
      window.currentUserData ||
      window.currentUser ||
      null;
    if(ud && ud.name) return ud.name;
  }catch(e){ /* ignore */ }

  try{
    const cached =
      localStorage.getItem(
        "lb_name_" + localStorage.getItem("uid")
      );
    if(cached) return cached;
  }catch(e){ /* ignore */ }

  return "Unknown";
}

function resolveMyAvatar(){
  try{
    const ud =
      window.currentUserData ||
      window.currentUser ||
      null;
    if(ud && ud.avatar) return ud.avatar;
  }catch(e){ /* ignore */ }
  return "";
}

function currentUid(){
  try{
    return localStorage.getItem("uid");
  }catch(e){
    return null;
  }
}

/* The current user's own best score for this lesson, read from the LOCAL
   progress cache instead of Firestore. This is the same key lessonEngine
   writes: "progress_" + lessonId + "_" + uid
   (js/lessonEngine.js:58 area, saveProgress at js/lessonEngine.js:1965).
   Reading it locally is what removes the per-user read entirely. */
function localBestScore(lessonId){
  try{
    const uid =
      localStorage.getItem("uid") ||
      localStorage.getItem("wallet") ||
      "guest";

    const raw =
      localStorage.getItem(
        "progress_" + lessonId + "_" + uid
      );

    if(!raw) return 0;

    const data = JSON.parse(raw);

    return Number(data && data.bestScore) || 0;
  }catch(e){
    return 0;
  }
}

/* =========================
   SAVE LEADERBOARD ENTRY  (the mirror write)
=========================

   Called by lessonEngine.saveCloudProgress() right after the authoritative
   users/{uid}/lessons/{lessonId} write succeeds.

   READ COST: ZERO. It never reads; it only writes the mirror document, which
   already carries everything the leaderboard needs to render.

   `bestScore` inside lessonEngine is monotonic within a session and is
   HYDRATED FROM THE CLOUD at lesson start (js/lessonEngine.js:1793), so
   setDoc({merge:true}) can never replace a higher stored score with a lower
   one. The in-memory sessionStorage guard additionally skips the repeated
   writes that would otherwise happen when saveCloudProgress() fires several
   times carrying the same bestScore (it fires every 5 answered questions).

   STAGE 2: after a successful write the cached board for THIS lesson is
   dropped, so the student's next look at the leaderboard shows the new rank
   instead of a stale cached copy. This is what keeps the cache "live".
*/
window.saveLeaderboardEntry = async function(){

  const engine = window.lessonEngine;

  const lessonId = engine && engine.lessonId;
  const uid = currentUid();

  if(!uid || !lessonId) return;

  const score = Number(engine.bestScore) || 0;

  // The old renderer filtered out score <= 0, so do not create such entries.
  if(score <= 0) return;

  // Skip a repeat write of the SAME score for the SAME lesson.
  const dedupeKey = "lbpush_" + uid + "_" + lessonId;
  try{
    if(
      window.sessionStorage.getItem(dedupeKey) === String(score)
    ){
      return;
    }
  }catch(e){ /* ignore */ }

  const name = resolveMyName();

  /* NO BASE64 AVATAR IN THIS PAYLOAD - and `deleteField()` actively removes
     one that is already there.

     WHY NOT WRITE IT
     `users/{uid}.avatar` is a base64 data URI (measured: up to ~200 KB) and
     this mirror document is rewritten once PER LESSON. A student with 10
     lessons was therefore carrying ~2 MB of duplicated avatar bytes in the
     leaderboard, plus the copy in users/{uid}.

     WHY IT IS SAFE TO DELETE
     Nothing renders it. renderLeaderboard() builds the row from
     rank / name / score / badge only, and tabs/leaderboard.html contains no
     avatar markup at all (grep "avatar" -> 0 hits). The `avatar` key is
     still read into the top10/me objects above purely as dead data carried
     over from the pre-mirror implementation - it is never put in the DOM.

     WHY deleteField() AND NOT JUST OMITTING THE KEY
     `merge: true` only touches the fields it is given, so simply dropping
     `avatar` from the payload would FREEZE every existing base64 blob in
     place forever - the exact bytes we are trying to get rid of. merge + a
     deleteField() sentinel lets each student purge their OWN old copies the
     next time they finish that lesson, with no admin credentials, no
     backfill run and no risk to anyone else's data. Documents that never had
     an avatar are unaffected: deleting a missing field is a no-op.

     tools/purge-leaderboard-avatar.mjs exists for the one-off sweep of the
     copies this lazy path can never reach (students who never come back). */
  await setDoc(
    doc(db, "leaderboard", lessonId, "entries", uid),
    {
      uid,
      name,
      avatar: deleteField(),
      score,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  /* STAGE 2 — invalidate the cached board for this lesson. */
  lbCache.delete(lessonId);

  try{
    window.sessionStorage.setItem(dedupeKey, String(score));
    localStorage.setItem("lb_name_" + uid, name);
  }catch(e){ /* ignore */ }
}

/* =========================
   CACHE HELPERS
========================= */

window.lbCacheClear =
function(){
  lbCache.clear();
}

window.lbCacheSize =
function(){
  return lbCache.size;
}

/* =========================
   RESTORE (tab re-entry)
========================= */

function restoreLeaderboardView(){

  const lesson = lbSelectedLesson;

  if(!lesson){
    showLeaderboardPrompt();
    return;
  }

  const cached = lbCache.get(lesson);

  if(cached){
    renderLeaderboard(
      cached.top10,
      cached.me,
      currentUid()
    );
    return;
  }

  showLeaderboardPrompt();

}

/* =========================
   VIEW  (release the brake)
========================= */

window.viewLeaderboard =
async function(){

  const lessonSelect =
    document.getElementById(
      "lessonFilter"
    );

  const lesson =
    lessonSelect ? lessonSelect.value : "";

  if(!lesson) return;

  lbSelectedLesson = lesson;

  /* Cache hit -> re-render, ZERO Firestore reads. */
  const cached = lbCache.get(lesson);

  if(cached){
    renderLeaderboard(
      cached.top10,
      cached.me,
      currentUid()
    );
    return;
  }

  await fetchAndRender(lesson);

}

/* =========================
   REFRESH  (force a fresh read)
========================= */

window.refreshLeaderboard =
async function(){

  const lessonSelect =
    document.getElementById(
      "lessonFilter"
    );

  const lesson =
    lbSelectedLesson ||
    (lessonSelect ? lessonSelect.value : "");

  if(!lesson) return;

  /* A request already in flight: do not start a second one, and do not
     start the cooldown either (nothing was actually read). */
  if(lbLoading) return;

  /* GLOBAL cooldown - one timestamp for the whole page, not per lesson. */
  if(Date.now() < lbRefreshUntil){
    updateRefreshButton();
    return;
  }

  lbSelectedLesson = lesson;

  lbRefreshUntil =
    Date.now() + LB_REFRESH_COOLDOWN_MS;

  updateRefreshButton();

  lbCache.delete(lesson);

  await fetchAndRender(lesson);

}

/* Backwards-compatible alias: any older caller of loadLeaderboard() now
   goes through the brake-aware path instead of querying unconditionally. */
window.loadLeaderboard =
window.viewLeaderboard;

/* =========================================================================
   FETCH  — the ONLY place that reads Firestore for the leaderboard
   ========================================================================= */

async function fetchAndRender(lesson){

  const container =
    document.getElementById(
      "leaderboardList"
    );

  if(!container) return;

  /* Re-entrancy guard: a double-click on "Xem" must not fire two queries. */
  if(lbLoading) return;

  lbLoading = true;

  try{

    container.innerHTML = `
      <div class="lb-loading">
        ⏳ Loading leaderboard...
      </div>
    `;

    const uid = currentUid();

    /* ---------------------------------------------------------------
       READ 1 — TOP 10 (10 document reads)
       Ordered on the server: score DESC, then updatedAt ASC so that
       whoever reached the score EARLIER is placed higher.
       --------------------------------------------------------------- */
    const topSnap =
      await getDocs(
        query(
          collection(db, "leaderboard", lesson, "entries"),
          orderBy("score", "desc"),
          orderBy("updatedAt", "asc"),
          limit(10)
        )
      );

    const top10 =
      topSnap.docs.map((d, i)=>{

        const v = d.data() || {};

        return {
          uid: d.id,
          name: v.name || "Unknown",
          avatar: v.avatar || "",
          score: Number(v.score) || 0,
          updatedAt: v.updatedAt || null,
          rank: i + 1
        };
      });

    /* ---------------------------------------------------------------
       CURRENT USER
       Inside the returned top 10 -> already known, NO extra read.
       Outside it                 -> rank via one aggregation count.
       No score at all            -> not ranked, NO extra read.
       --------------------------------------------------------------- */
    let me =
      top10.find(u=>u.uid === uid) || null;

    if(!me && uid){

      const myScore = localBestScore(lesson);

      if(myScore > 0){

        /* READ 2 — rank = (number of entries strictly above me) + 1.
           Aggregation count() is a Firestore server-side operation and is
           NOT a Cloud Function, so it runs on the Spark plan.
           Cost: 1 document read for this single-range query (see the PR
           body for the index-entry caveat). */
        const countSnap =
          await getCountFromServer(
            query(
              collection(db, "leaderboard", lesson, "entries"),
              where("score", ">", myScore)
            )
          );

        me = {
          uid,
          name: resolveMyName(),
          avatar: resolveMyAvatar(),
          score: myScore,
          updatedAt: null,
          rank: countSnap.data().count + 1
        };
      }
    }

    /* Cache the DATA (never the HTML) and keep the Map bounded. */
    lbCache.set(lesson, {
      top10,
      me,
      ts: Date.now()
    });

    if(lbCache.size > LB_CACHE_MAX){
      const oldest =
        lbCache.keys().next().value;
      lbCache.delete(oldest);
    }

    renderLeaderboard(top10, me, uid);

  }catch(err){

    console.error(err);

    /* A missing composite index surfaces here as FAILED_PRECONDITION.
       The index must be created BEFORE this code is deployed — see the
       PR description. */
    container.innerHTML = `

      <div class="lb-loading">
        ❌ Failed to load leaderboard
      </div>

    `;

  }finally{

    lbLoading = false;

  }

}

/* =========================================================================
   RENDER — pure, no Firestore access. Markup preserved verbatim from the
   previous implementation so the DOM contract and the CSS are untouched.
   ========================================================================= */

/* =========================================================================
   HTML ESCAPE (XSS GUARD)

   WHY
     Leaderboard rows are built with innerHTML += `...`, and the fields
     interpolated into them come straight out of Firestore:
       - user.name / me.name  <- users/{uid}.name, free text typed by the
         student in the "Doi ten" modal (js/profile.js:saveChangeName,
         validated only for length 1-30, no character filtering)
       - it is mirrored into leaderboard/{lessonId}/entries/{uid}.name by
         window.saveLeaderboardEntry()

     A student who names themselves `<img src=x onerror=...>` therefore
     stores markup that every OTHER viewer's browser executes on render.
     That is stored XSS, not self-XSS: one attacker, many victims.

   WHY A LOCAL COPY INSTEAD OF IMPORTING
     js/users/users.js:200 already defines escapeHTML(), but this file is a
     plain <script> (not a module, no exports) and users.js is an ES module
     loaded only on adminpanel.html. Importing across that boundary would
     mean re-declaring this file as a module and changing how home.html and
     lesson.html load it - a bigger blast radius than the bug. The helper is
     therefore duplicated locally, byte-for-byte identical to the users.js
     one, so the two cannot drift in behaviour.

   SCOPE
     Escaping is applied to the STRING fields only (name). rank / score are
     emitted by Number() coercions upstream and stay numeric.
========================================================================= */

function escapeHTML(value){

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderLeaderboard(top10, me, uid){

  const container =
    document.getElementById(
      "leaderboardList"
    );

  if(!container) return;

  container.innerHTML = "";

  top10.forEach((user,index)=>{

    const isMe =
      user.uid === uid;

    let badge = "🥉";
    let topClass = "";

    if(index === 0){
      badge = "👑";
      topClass = "lb-gold";
    }
    else if(index === 1){
      badge = "🥈";
      topClass = "lb-silver";
    }
    else if(index === 2){
      badge = "🥉";
      topClass = "lb-bronze";
    }

    container.innerHTML += `

      <div class="lb-row
   ${topClass}
   ${isMe ? 'lb-me' : ''}">

        <div class="lb-rank">
          ${user.rank}
        </div>

        <div class="lb-name">
          ${escapeHTML(user.name)}
        </div>

        <div class="lb-score">
          ${user.score}
        </div>

        <div>
          <div class="lb-badge">
            ${badge}
          </div>
        </div>

        <div></div>

        <div></div>

      </div>

    `;
  });

  if(me && me.rank > 10){
    container.innerHTML += `
  <div class="lb-separator">
    •••
  </div>
  <div class="lb-row lb-me">
    <div class="lb-rank">
      ${me.rank}
    </div>
    <div class="lb-name">
      ${escapeHTML(me.name)}
    </div>
    <div class="lb-score">
      ${me.score}
    </div>
    <div>
      <div class="lb-badge">
        👤
      </div>
    </div>
    <div></div>
    <div></div>
  </div>
`;
  }

  if(top10.length === 0){

    container.innerHTML = `

      <div class="lb-loading">
        No leaderboard data
      </div>

    `;
  }

}
