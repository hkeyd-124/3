/* =========================
   COURSES
========================= */

const totals = {};

COURSE_CONFIG.forEach(topic=>{

    topic.lessons.forEach(lesson=>{

        totals[
            lesson.id
        ] = lesson.total;

    });

});

/* =========================
   TOGGLE COURSE
========================= */

window.toggleCourse =
function(id){

  const el =
    document.getElementById(id);

  if(!el) return;

  const topics =

    document.querySelectorAll(
      "[id^='topic_']"
    );

  topics.forEach(topic=>{

    if(topic.id !== id){

      topic.style.display =
        "none";

    }

  });

  el.style.display =

    el.style.display === "none"

      ? "block"

      : "none";
}

/* =========================
   OPEN COURSE LESSON
   (COURSES -> lesson/)
========================= */

window.openCourseLesson =
function(id,name){

  localStorage.setItem(
    "currentLessonName",
    name
  );

 

 window.location.href =
  "lesson.html?id=" + id;
}

/* =========================
   BIND EVENTS
========================= */

window.bindCourseEvents = function(){

  const buttons =
    document.querySelectorAll(
      ".lesson-btn"
    );

  buttons.forEach(btn=>{

    btn.onclick = ()=>{

      const lesson =
        btn.dataset.lesson;

      const name =
        btn.dataset.name;

      openCourseLesson(
        lesson,
        name
      );

    };

  });
}

/* =========================
   GET PERCENT
========================= */

window.getCoursePercent =
function(id){

  const wallet =
    getWallet()
    || "guest";

  const uid =
    getUID()
    || wallet;

  const data = JSON.parse(

    localStorage.getItem(
      "progress_" +
      id +
      "_" +
      uid
    )

  );

  if(!data) return 0;

  const correct =

    Object.values(
      data.answers || {}
    )

    .filter(v=>v==="correct")
    .length;

  const total =
    totals[id];

  return Math.round(
    (correct/total)*100
  );
}

/* =========================
   COLOR
========================= */

window.setCourseColor =
function(el,percent){

  if(percent < 25){

    el.style.background =
      "#F44336";

  }
  else if(percent < 50){

    el.style.background =
      "#FF9800";

  }
  else if(percent < 75){

    el.style.background =
      "#FFC107";

  }
  else{

    el.style.background =
      "#4CAF50";
  }
}

/* =========================
   BOSS UNLOCK
========================= */

window.checkBossUnlockCourse =
function(p1,p2,p3,p4){

  const boss =
    document.getElementById(
      "bossStatus"
    );

  if(!boss) return;

  if(
    p1>=75 &&
    p2>=75 &&
    p3>=75 &&
    p4>=75
  ){

    boss.innerText = "GO";

    boss.style.background =
      "#4CAF50";

  }else{

    boss.innerText = "LOCK";

    boss.style.background =
      "#999";
  }
}

/* =========================
   OPEN BOSS
========================= */

window.openBossLesson =
function(){

  const boss =
    document.getElementById(
      "bossStatus"
    );

  if(
    boss &&
    boss.innerText === "LOCK"
  ){

    alert(
      "🔒 Hoàn thành tất cả bài ≥ 75% để mở khóa!"
    );

    return;
  }

  window.location.href =
    "lesson/boss.html";
}

/* =========================
   APPLY PROGRESS
========================= */

window.applyCourseProgress =
function(){

  COURSE_CONFIG.forEach(topic=>{

    let totalPercent = 0;

    let lessonCount = 0;

    let bossUnlocked = true;

    topic.lessons.forEach(lesson=>{

      const percent =

        getCoursePercent(
          lesson.id
        );

      const lessonEl =

        document.getElementById(
          `lessonPercent_${lesson.id}`
        );

      if(lessonEl){

        lessonEl.innerText =
          percent + "%";

        setCourseColor(
          lessonEl,
          percent
        );
      }

      totalPercent += percent;

      lessonCount++;

      if(percent < 75){

        bossUnlocked = false;
      }

    });

    const avg =

      lessonCount

      ? Math.round(
          totalPercent /
          lessonCount
        )

      : 0;

    const topicEl =

      document.getElementById(
        `topicPercent_${topic.id}`
      );

    if(topicEl){

      topicEl.innerText =
        avg + "%";

      setCourseColor(
        topicEl,
        avg
      );
    }

    const bossEl =

      document.getElementById(
        `boss_${topic.id}`
      );

    if(bossEl){

      bossEl.innerText =

        bossUnlocked

          ? "GO"

          : "LOCK";

      bossEl.style.background =

        bossUnlocked

          ? "#4CAF50"

          : "#999";
    }

  });

}


/* =========================
   RENDER COURSES
========================= */

window.renderCourses =
function(){

  const container =
    document.getElementById(
      "coursesList"
    );

  if(!container) return;

  let html = "";

  COURSE_CONFIG.forEach(

    (topic,index)=>{

      html += `

      <div
 class="course-topic"
 onclick="
   toggleCourse(
     'topic_${index}'
   )
 "
 style="
   margin-top:24px;
 "
>

        <div>
          ${topic.title}
        </div>

        <div
          class="percent-circle"
          id="topicPercent_${topic.id}"
        >
          0%
        </div>

      </div>

     <div
  id="topic_${index}"
  style="display:none;"
>

      `;

      topic.lessons.forEach(

        (lesson,lessonIndex)=>{

          html += `

          <div
            class="course-lesson lesson-btn"

            data-lesson="${lesson.id}"

            data-name="${lesson.name}"
          >

            <div>

              Bài ${
                lessonIndex + 1
              }:

              ${lesson.name}

            </div>

            <div

              class="percent-circle"

              id="lessonPercent_${lesson.id}"

            >

              0%

            </div>

          </div>

          `;

        }
      );

      html += `

      <div
  class="course-lesson boss-btn"

  data-topic="${topic.id}"

  data-boss="${topic.bossLesson}"
>

        <div>
          🔥 Boss
        </div>

        <div

          class="percent-circle"

          id="boss_${topic.id}"

        >

          LOCK

        </div>

      </div>

      `;

      html += `</div>`;
    }
  );

  container.innerHTML = html;
}
window.bindBossEvents =
function(){

  const bosses =

    document.querySelectorAll(
      ".boss-btn"
    );

  bosses.forEach(boss=>{

    boss.onclick = ()=>{

      const lessonId =

        boss.dataset.boss;

      const statusEl =

        boss.querySelector(
          ".percent-circle"
        );

      if(
        !statusEl
      ) return;

      if(
        statusEl.innerText !==
        "GO"
      ){

        alert(
          "🔒 Hoàn thành tất cả lesson ≥ 75% để mở khóa Boss."
        );

        return;
      }

      window.location.href =

        "lesson.html?id=" +

        lessonId;

    };

  });

}
