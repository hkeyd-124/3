import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  where,
  getCountFromServer,
  setDoc,
  serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================================================
   LEADERBOARD — STAGE 1 (read-optimised)
   -------------------------------------------------------------------------
   BEFORE (measured on main @ 085b811):
     getDocs(collection("users"))                    -> 1 read per user
     + getDoc(users/{uid}/lessons/{lessonId})        -> 1 read per user
     = 2 x N reads per render   (400 reads at N = 200)

   AFTER:
     query(leaderboard/{lessonId}/entries,
           orderBy score desc, orderBy updatedAt asc, limit(10))  -> 10 reads
     + getCountFromServer(score > myScore)
           ONLY when the current user is not in the returned top 10
                                                                  ->  1 read
     = 10 reads (user inside top 10) or 11 reads (user outside)

   WHY A NEW COLLECTION IS REQUIRED
     The score does NOT live on users/{uid}; it lives in the subcollection
     users/{uid}/lessons/{lessonId}. Firestore cannot sort a parent
     collection by a field of a subcollection, so
     collection("users").orderBy("bestScore").limit(10) is impossible.
     Hence the mirror collection below.

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

  topicSelect.innerHTML = "";

  COURSE_CONFIG.forEach(topic=>{

    topicSelect.innerHTML += `

      <option
        value="${topic.id}"
      >

        ${topic.title}

      </option>

    `;

  });

}

/* =========================
   LOAD LESSONS
========================= */

window.loadLessons = function(){

  const topic =
    document.getElementById(
      "topicFilter"
    ).value;

  const lessonSelect =
    document.getElementById(
      "lessonFilter"
    );

  if(!lessonSelect) return;

  lessonSelect.innerHTML = "";

  const lessons =
    window.lessonMap[topic];

  lessons.forEach(lesson=>{

    lessonSelect.innerHTML += `

      <option value="${lesson.id}">
        ${lesson.name}
      </option>

    `;

  });

  loadLeaderboard();
}

/* =========================================================================
   STAGE-1 HELPERS
   ========================================================================= */

/* Name/avatar are DENORMALISED into the mirror document so that rendering
   the leaderboard never has to read users/{uid} again (that per-user read
   was the N+1 half of the old 2 x N cost). */
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
  const avatar = resolveMyAvatar();

  await setDoc(
    doc(db, "leaderboard", lessonId, "entries", uid),
    {
      uid,
      name,
      avatar,
      score,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  try{
    window.sessionStorage.setItem(dedupeKey, String(score));
    localStorage.setItem("lb_name_" + uid, name);
  }catch(e){ /* ignore */ }
}

/* =========================
   LOAD LEADERBOARD
========================= */

window.loadLeaderboard =
async function(){

  const container =
    document.getElementById(
      "leaderboardList"
    );

  if(!container) return;

  try{

    container.innerHTML = `
      <div class="lb-loading">
        ⏳ Loading leaderboard...
      </div>
    `;

    const lesson =
      document.getElementById(
        "lessonFilter"
      ).value;

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

    /* ---------------------------------------------------------------
       RENDER — markup preserved verbatim from the previous implementation
       --------------------------------------------------------------- */
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
            ${user.name}
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
        ${me.name}
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
  }
}
