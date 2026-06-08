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
          style="
          width:100%;
          padding:12px;
          border-radius:12px;
          border:1px solid #ddd;
          cursor:pointer;
          ">
          D. O₂
        </button>

      `;
    }

  }
);
