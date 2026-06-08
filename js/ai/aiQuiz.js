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
document.addEventListener(

  "click",

  e=>{

    if(
      e.target.id ===
      "generateQuizBtn"
    ){

      document.getElementById(
        "quizResult"
      ).style.display =
        "block";

      document.getElementById(
        "quizQuestion"
      ).innerText =
        "What is the chemical symbol of Water?";

      document.getElementById(
  "quizAnswers"
).innerHTML = `

<button
  class="quiz-option"
  data-correct="true"

  style="
  width:100%;
  margin-bottom:10px;
  padding:12px;
  border-radius:12px;
  border:1px solid #ddd;
  cursor:pointer;
  ">
  A. H₂O
</button>

<button
  class="quiz-option"

  style="
  width:100%;
  margin-bottom:10px;
  padding:12px;
  border-radius:12px;
  border:1px solid #ddd;
  cursor:pointer;
  ">
  B. CO₂
</button>

<button
  class="quiz-option"

  style="
  width:100%;
  margin-bottom:10px;
  padding:12px;
  border-radius:12px;
  border:1px solid #ddd;
  cursor:pointer;
  ">
  C. NaCl
</button>

<button
  class="quiz-option"

  style="
  width:100%;
  padding:12px;
  border-radius:12px;
  border:1px solid #ddd;
  cursor:pointer;
  ">
  D. O₂
</button>

<div
  id="quizFeedback"

  style="
  display:none;
  margin-top:15px;
  font-weight:bold;
  ">
</div>

`;
    }

  }
);
document.addEventListener(

  "click",

  e=>{

    if(
      !e.target.classList
      ?.contains(
        "quiz-option"
      )
    ) return;

    const feedback =
      document.getElementById(
        "quizFeedback"
      );

    if(
      e.target.dataset.correct
      === "true"
    ){

      e.target.style.background =
        "#dcfce7";

      feedback.innerText =
        "✅ Correct!";

    }else{

      e.target.style.background =
        "#fee2e2";

      feedback.innerText =
        "❌ Wrong Answer";

    }

    feedback.style.display =
      "block";
  }
);
