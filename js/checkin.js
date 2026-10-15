/* =========================
   FIREBASE
========================= */

import {

  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  getAggregateFromServer,
  sum

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {

  db

}

from "../firebase.js";

/* =========================
   VN TIME
========================= */

window.getVNDate =
function(){

  return new Date(

    new Date().toLocaleString(
      "en-US",
      {
        timeZone:
          "Asia/Ho_Chi_Minh"
      }
    )
  );
}

window.formatDate =
function(date){

  const y =
    date.getFullYear();

  const m =
    String(
      date.getMonth()+1
    ).padStart(2,"0");

  const d =
    String(
      date.getDate()
    ).padStart(2,"0");

  return `${y}-${m}-${d}`;
}

window.getTodayKey =
function(){

  return formatDate(
    getVNDate()
  );
}

window.getYesterdayKey =
function(){

  const vn =
    getVNDate();

  vn.setDate(
    vn.getDate()-1
  );

  return formatDate(vn);
}

/* =========================
   REWARD
========================= */

window.getReward =
function(streak){

  if(streak === 1)
    return 1;

  if(streak === 2)
    return 2;

  if(streak === 3)
    return 3;

  if(streak === 4)
    return 4;

  if(streak <= 9)
    return 5;

  return 10;
}

/* =========================
   CHECKIN MODAL
========================= */

window.openCheckin =
function(){

  document
    .getElementById(
      "checkinModal"
    )
    .style.display =
      "flex";

  renderCheckinDays();
}

window.closeCheckin =
function(){

  document
    .getElementById(
      "checkinModal"
    )
    .style.display =
      "none";
}

/* =========================
   RENDER DAYS
========================= */

window.renderCheckinDays =
function(){

  const streak =
    window.currentUserStreak
    || 0;

  const today =
    getTodayKey();

  const last =
    window.currentLastCheckin
    || "";

  const todayIndex =

    last === today

    ? streak

    : streak + 1;

  const box =
    document.getElementById(
      "checkinDays"
    );

  if(!box) return;

  box.innerHTML = "";

  let start =
    todayIndex - 5;

  if(start < 1)
    start = 1;

  let end =
    start + 14;

  for(
    let i=start;
    i<=end;
    i++
  ){

    const div =
      document.createElement(
        "div"
      );

    let bg =
      "#f1f5f9";

    let cursor =
      "pointer";

    let opacity =
      "1";

    if(i < todayIndex){

      bg = "#d1fae5";

      cursor =
        "not-allowed";
    }

    else if(
      i === todayIndex
    ){

      if(last === today){

        bg = "#d1fae5";

        cursor =
          "not-allowed";
      }

      else{

        bg = "#fff8dc";

        cursor =
          "pointer";
      }
    }

    else{

      bg = "#ddd";

      opacity = "0.6";

      cursor =
        "not-allowed";
    }

    div.style.cssText = `

      width:85px;
      height:100px;
      border-radius:18px;
      background:${bg};
      flex:0 0 auto;

      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;

      font-weight:bold;

      cursor:${cursor};

      opacity:${opacity};

      transition:0.2s;

    `;

    const reward =
      getReward(i);

    div.innerHTML = `

      <div>
        Day ${i}
      </div>

      <div style="
        margin-top:8px;
      ">
        +${reward}🧪
      </div>

    `;

    div.onclick =
    async ()=>{

      if(
        i !== todayIndex
      ) return;

      await handleCheckin();
    };

    box.appendChild(div);
  }
}

/* =========================
   LESSON SCORE
========================= */

window.getTotalLessonScore =
async function(){

  const uid =
    localStorage.getItem(
      "uid"
    );

  if(!uid) return 0;

  try{

    const lessonsRef =
      collection(
        db,
        "users",
        uid,
        "lessons"
      );

    /* AGGREGATION instead of downloading every lesson document.
       ---------------------------------------------------------
       This used to be an UNBOUNDED getDocs(lessonsRef), so its cost
       equalled the number of lessons the student had played (2 read per
       lesson, because renderDashboardPoints() ran twice per home load).
       In a 15-lesson course that is up to 30 reads just to display one
       number.

       sum() is computed server-side and billed per 1000 index entries
       (minimum one read), so it is O(1) in cost AND correct — unlike
       limit(N), which would have silently truncated the total.

       Value equivalence vs the old loop: the loop added
       (data.bestScore || 0) per document, i.e. it treated a missing or
       falsy field as 0. Official docs: for sum() "non-numeric values are
       ignored" and documents missing the field contribute nothing. Both
       sides therefore add 0 for those documents. A genuinely
       string-typed bestScore is the only divergence, and it does not
       occur in this schema (saveCloudProgress always writes a number). */
    const agg =
      await getAggregateFromServer(
        lessonsRef,
        {
          total: sum("bestScore")
        }
      );

    const total =
      Number(agg.data().total) || 0;

    return total;

  }catch(err){

    console.error(
      err
    );

    return 0;
  }
}

/* =========================
   DASHBOARD POINTS
========================= */

window.renderDashboardPoints =
async function(){

  const pointEl =
    document.getElementById(
      "pointValue"
    );

  if(!pointEl) return;

  const userPoints =

    window.currentUserData
    ?.points || 0;

  const lessonScore =

    await getTotalLessonScore();

  const total =

    userPoints
    +
    lessonScore;

  pointEl.innerText =
    total;
}

/* =========================
   HANDLE CHECKIN
========================= */

window.handleCheckin =
async function(){

  const uid =
    localStorage.getItem(
      "uid"
    );

  if(!uid) return;

  try{

    showLoading(
      "Checking in..."
    );

    const ref =
      doc(
        db,
        "users",
        uid
      );

    const snap =
      await getDoc(ref);

    let data =

      snap.exists()

      ? snap.data()

      : {};

    const today =
      getTodayKey();

    const yesterday =
      getYesterdayKey();

    const last =
      data.lastCheckin
      || "";

    if(last === today){

      hideLoading();

      showToast(
        "Bạn đã check-in hôm nay!"
      );

      return;
    }

    let streak = 1;

    if(last === yesterday){

      streak =
        (data.streak || 0)
        + 1;
    }

    const reward =
      getReward(
        streak
      );

    await setDoc(

      ref,

      {

        points:
          (data.points || 0)
          + reward,

        streak,

        lastCheckin:
          today

      },

      {

        merge:true

      }
    );

    window.currentUserStreak =
      streak;

    window.currentLastCheckin =
      today;

    if(
      window.currentUserData
    ){

      window.currentUserData.points =

        (data.points || 0)
        + reward;
    }

    await renderDashboardPoints();

    renderCheckinDays();

    hideLoading();

    showToast(
      `🎉 +${reward} points`
    );

    closeCheckin();

  }catch(err){

    hideLoading();

    console.error(err);

    showToast(
      "Check-in thất bại",
      "error"
    );
  }
}

/* =========================
   QUICK BUTTON
========================= */

window.updateCheckinButton =
function(){

  const btn =
    document.getElementById(
      "checkinQuickBtn"
    );

  if(!btn) return;

  const today =
    getTodayKey();

  const last =
    window.currentLastCheckin
    || "";

  btn.style.display =

    last === today

    ? "none"

    : "inline-flex";
}
