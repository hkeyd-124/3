import {
  collection,
  getDocs,
  doc,
  getDoc
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
/* =========================
   LEADERBOARD
========================= */

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

    const usersSnap =
      await getDocs(
        collection(db,"users")
      );

    let leaderboard = [];

    for(const userDoc of usersSnap.docs){

      const userData =
        userDoc.data();

      const uid =
        userDoc.id;

      const lessonRef =
        doc(
          db,
          "users",
          uid,
          "lessons",
          lesson
        );

      const lessonSnap =
        await getDoc(lessonRef);

      if(lessonSnap.exists()){

        const lessonData =
          lessonSnap.data();

        leaderboard.push({

          uid,

          name:
            userData.name
            || "Unknown",

          score:lessonData.bestScore || 0,
          updatedAt:lessonData.updatedAt || null

        });

      }
    }
leaderboard = leaderboard.filter(
  u=>u.score > 0
);
    leaderboard.sort((a,b)=>{

  // PRIORITY 1
  // BEST SCORE

  if(
    b.score !== a.score
  ){

    return b.score - a.score;
  }

  // PRIORITY 2
  // EARLIER TIME WINS

  const aTime =
    a.updatedAt?.seconds || 0;

  const bTime =
    b.updatedAt?.seconds || 0;

  return aTime - bTime;
});
leaderboard.forEach(
  (u,i)=>{
    u.rank = i + 1;
  }
);

const currentUid =
  localStorage.getItem(
    "uid"
  );

const me =
  leaderboard.find(
    u=>u.uid===currentUid
  );

const top10 =
  leaderboard.slice(0,10);
    container.innerHTML = "";

   top10.forEach((user,index)=>{

      const isMe =
        user.uid === currentUid;

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

    
    if( me  &&  me.rank > 10 ){
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
    
    if(leaderboard.length === 0){

      container.innerHTML = `

        <div class="lb-loading">
          No leaderboard data
        </div>

      `;
    }

  }catch(err){

    console.error(err);

    container.innerHTML = `

      <div class="lb-loading">
        ❌ Failed to load leaderboard
      </div>

    `;
  }
}
