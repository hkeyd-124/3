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
      ||
      e.target.id ===
      "nextQuizBtn"
    ){
      document.getElementById(
  "quizResult"
).style.display =
  "block";

document.getElementById(
  "quizQuestion"
).innerHTML =
  `<div
  style="
  text-align:center;
  padding:20px;
  color:#666;
  ">
  ⏳ Đang tạo câu hỏi...
</div>
`;

document.getElementById(
  "quizAnswers"
).innerHTML = "";

document.getElementById(
  "quizFeedback"
).style.display =
  "none";

document.getElementById(
  "nextQuizBtn"
).style.display =
  "none";
    AI_STATE.quizAnswered =
    false;
      document.getElementById(
        "quizResult"
      ).style.display =
        "block";

      fetch(

  "/api/ai-quiz",

  {

    method:"POST",

    headers:{

      "Content-Type":
        "application/json"

    },

    body:JSON.stringify({
  topic:
    document.getElementById(
      "quizTopic"
    ).value,
  difficulty:
    document.getElementById(
      "quizDifficulty"
    ).value,
  history:
    AI_STATE.quizHistory
})

  }

)

.then(

  res=>res.json()

)

.then(

  quiz=>{

    AI_STATE.currentQuiz =
      quiz;
AI_STATE.quizHistory.push(
  quiz.question
);

if(
  AI_STATE.quizHistory.length
  > 10
){

  AI_STATE.quizHistory.shift();

}
    document.getElementById(
  "quizQuestion"
).innerHTML =
  quiz.question;

    document.getElementById(
      "quizAnswers"
    ).innerHTML =

      quiz.options.map(

        option=>`

<button
  class="quiz-option"

  data-answer="${option}"

  style="
  width:100%;
  margin-bottom:10px;
  padding:12px;
  border-radius:12px;
  border:1px solid #ddd;
  cursor:pointer;
  ">
  ${option}
</button>
`).join("");

if(
  window.renderMathInElement
){
  renderMathInElement(
  document.getElementById(
    "quizQuestion"
  ),
    {
      delimiters:[
        {
          left:"$$",
          right:"$$",
          display:true
        },
        {
          left:"$",
          right:"$",
          display:false
        }
      ]
    }
  );
  document
  .querySelectorAll(
    ".quiz-option"
  )
  .forEach(
    btn=>{

      renderMathInElement(
        btn,
        {
          delimiters:[
            {
              left:"$$",
              right:"$$",
              display:true
            },
            {
              left:"$",
              right:"$",
              display:false
            }
          ]
        }
      );

    }
  );
}
    
document.getElementById(
  "quizFeedback"
).style.display =
  "none";

document.getElementById(
  "quizFeedback"
).innerHTML = "";

document.getElementById(
  "nextQuizBtn"
).style.display =
  "none";
  }

)

.catch(

  err=>{

    console.error(err);

  }

);
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
if(
  AI_STATE.quizAnswered
) return;
    const feedback =
      document.getElementById(
        "quizFeedback"
      );

    const selectedAnswer =

  e.target.dataset.answer;

const correctAnswer =

  AI_STATE.currentQuiz
    .correctAnswer;

if(
  selectedAnswer ===
  correctAnswer
){

  e.target.style.background =
    "#dcfce7";

  feedback.innerText =
    "✅ Chính xác!";

  AI_STATE.quizScore++;

}else{

  e.target.style.background =
    "#fee2e2";

  feedback.innerText =
    `❌ Sai

Đáp án đúng:
${correctAnswer}`;

}

    feedback.innerHTML +=
  `<br><br>
  💡 ${AI_STATE.currentQuiz.explanation}`;
feedback.style.display =
  "block";
    if(
  window.renderMathInElement
){

  renderMathInElement(
    feedback,
    {
      delimiters:[
        {
          left:"$$",
          right:"$$",
          display:true
        },
        {
          left:"$",
          right:"$",
          display:false
        }
      ]
    }
  );

}
    document.getElementById(
  "nextQuizBtn"
).style.display =
  "block";
    AI_STATE.quizAnswered =
  true;

    document.getElementById(
  "quizScore"
).innerText =
  `Score: ${AI_STATE.quizScore}`;
    
  }
);
