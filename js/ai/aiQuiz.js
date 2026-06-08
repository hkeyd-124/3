window.openAIQuiz = function(){

  document.getElementById(
    "aiHomeView"
  ).style.display = "none";

  document.getElementById(
    "aiTutorView"
  ).style.display = "none";

  document.getElementById(
    "aiQuizView"
  ).style.display = "block";
};

window.backToAIHome = function(){

  document.getElementById(
    "aiTutorView"
  ).style.display = "none";

  document.getElementById(
    "aiQuizView"
  ).style.display = "none";

  document.getElementById(
    "aiHomeView"
  ).style.display = "block";
};
