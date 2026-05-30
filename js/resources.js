window.toggleTopic = function(id){

  const el =
    document.getElementById(id);

  if(!el) return;

  el.style.display =
    el.style.display === "block"
      ? "none"
      : "block";
}

/* =========================
   OPEN RESOURCE LESSON
   (ROOT LEVEL FILES)
========================= */

window.openLessonSPA = function(id){

  console.log(
    "OPEN RESOURCE LESSON:",
    id
  );

  const lessonMap = {

    organic_1:"organic.html",

    organic_2:"alkane.html",

    organic_3:"alkene.html",

    organic_4:"fuel.html"

  };

  const file =
    lessonMap[id];

  if(!file){

    alert("Lesson not found");

    return;
  }

  /*
    ROOT LEVEL
    cùng cấp home.html
  */

  window.location.href =
    file +
    "?lesson=" +
    id;
}
