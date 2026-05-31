window.lessonEngine = {
  lessonId:null,
  current:0,
  score:150,
  answers:{},
  selectedAnswers:{},
  hints:{},
  hiddenOptions:{},
  flashWrong:{},
  trueFalseStates:{},
  trueFalseScored:{},
  wrongTimeouts:{},
  questions:[],
  saveKey:null,
  cloudSaveTimeout:null,
  cloudLoaded:false,
  unsavedChanges:0,
  bestScore:150,
  firstScore:null,
  completed:false,
  rank:"C",
  certificateMinted:false,
  mintedScore:null,
  mintedRank:null,
  mintedAt:null,
  mintedTokenId:null,
  metadataURI:null,
  config:null,
  content:null,
  
  start:async function(){
    const params =
      new URLSearchParams(
        window.location.search
      );
    this.lessonId =
      params.get("id");
    const uid =
      localStorage.getItem("uid")
      ||
      localStorage.getItem("wallet")
      ||
      "guest";
if(
  window.loadCurrentUser
){

  await loadCurrentUser();

  console.log(
    "LESSON USER:",
    window.currentUser
  );

}
    this.saveKey =

      "progress_"

      +

      this.lessonId

      +

      "_"

      +

      uid;

    if(!this.lessonId){

      alert("Lesson not found");

      return;
    }


     // LOAD FILES

    await this.loadScript(
      `./lessons/${this.lessonId}/config.js`
    );

    await this.loadScript(
      `./lessons/${this.lessonId}/content.js`
    );

    await this.loadScript(
      `./lessons/${this.lessonId}/questions.js`
    );

    // SAVE

    this.config =
      window.lessonConfig;

    this.content =
      window.lessonContent;

    this.questions =
      window.lessonQuestions;

    // INIT

    this.score =
      this.config.startScore;

    this.loadProgress();
await this.loadCloudProgress();
    // UI

    this.renderTools();

    this.loadTool("pdf");

    this.renderNav();

    this.renderQuestion();

    this.updateScore();
   await this.renderCertificateButton();
   if(
  this.completed
  &&
  this.firstScore
  != null
){
  retryBtn.style.display =
    "inline-block";
}
  },

  /* =========================
     LOAD SCRIPT
  ========================= */

  loadScript:function(src){

    return new Promise(resolve=>{

      const script =
        document.createElement(
          "script"
        );

      script.src = src;

      script.onload =
        resolve;

      document.body
        .appendChild(script);

    });
  },

  /* =========================
     TOOLS
  ========================= */

  renderTools:function(){

    const bar =
      document.getElementById(
        "toolBar"
      );

    bar.innerHTML = "";

    this.content.tools
    .forEach(tool=>{

      const btn =
        document.createElement(
          "button"
        );

      btn.className =
        "tool-btn";

      btn.innerText =
        tool.title;

      btn.onclick = ()=>{

        this.loadTool(
          tool.id
        );

        document
          .querySelectorAll(
            ".tool-btn"
          )
          .forEach(b=>
            b.classList
             .remove("active")
          );

        btn.classList
          .add("active");
      };

      bar.appendChild(btn);

    });
  },

  loadTool:function(id){

    const tool =
      this.content.tools
      .find(t=>t.id===id);

    if(!tool) return;

    const left =
      document.getElementById(
        "leftContent"
      );

    if(tool.type==="pdf"){

      left.innerHTML = `

        <iframe
          src="${tool.src}"
          width="100%"
          height="100%"
          style="border:none;">
        </iframe>

      `;
    }
  },

  /* =========================
QUESTIONS
========================= */

renderQuestion:function(){

const q =
this.questions[
this.current
];

// RESET

questionText.innerHTML =
"";

options.innerHTML =
"";

// ROUTER

switch(q.type){
  case "single":
    this.renderSingle(q);
    break;
  case "truefalse":
    this.renderTrueFalse(q);
    break;
}
},


  
renderCertificateButton:async function(){

  const btn =

    document.getElementById(
      "certificateBtn"
    );

  if(!btn) return;

  btn.style.display = "none";

  const uid =
    localStorage.getItem(
      "uid"
    );

  if(!uid) return;

  try{

    const ref =

      doc(
        db,
        "users",
        uid,
        "lessons",
        this.lessonId
      );

    const snap =
      await getDoc(ref);

    if(!snap.exists()){
      return;
    }

    const data =
      snap.data();

    if(
      !data
      .certificateEligible
    ){
      return;
    }

    btn.style.display =
      "inline-block";
btn.onclick = ()=>{

  this.showCertificateModal();

};
    if(
      data
      .certificateMinted
    ){

      btn.innerText =
        "🏆 Xem thành tích";

    }else{

      btn.innerText =
        "🎓 Lấy chứng chỉ";
    }

  }catch(err){

    console.error(
      err
    );
  }
},

  showCertificateModal:async function(){

  const displayScore =
  this.certificateMinted
  ? this.mintedScore
  : this.bestScore;

const displayTier =
  this.certificateMinted
  ? this.mintedRank
  : getTier(this.bestScore);

const canvas =
  await generateCertificatePreview({

    name:
      window.currentUserData?.name || "Unknown",

    avatar:
      window.currentUserData?.avatar || null,

    lesson:
      lessonConfig.title,

    score:
      displayScore,

    maxScore:
      lessonConfig.maxScore,

    tier:
      displayTier

  });
    
canvas.style.width =
  "500px";
canvas.style.height =
  "auto";
    
  const modal =

  document.getElementById(
    "certificateModal"
  );

const content =

  document.getElementById(
    "certificateContent"
  );

content.innerHTML = "";

content.appendChild(
  canvas
);

modal.style.display =
  "flex";
},
/* =========================
SINGLE RENDER
========================= */

renderSingle:function(q){

questionText.innerHTML =
q.q;
q.opt.forEach((opt,i)=>{

const btn =
  document.createElement(
    "button"
  );

btn.innerHTML = opt;
const hidden =

  this.hiddenOptions[
    this.current
  ] || [];

if(
  hidden.includes(i)
){

  btn.style.opacity =
    "0.3";

  btn.disabled = true;
}
const state =
  this.answers[
    this.current
  ];


if(
  state === "correct"
  &&
  i === q.a
){

  btn.classList.add(
    "correct"
  );
}

// WRONG

if(
  this.flashWrong[
    this.current
  ]
  &&
  this.selectedAnswers[
    this.current
  ] === i
){
  btn.classList.add(
    "wrong"
  );
}

// SELECTED

if(

  (
    this.selectedAnswers[
      this.current
    ] === i
  )

  ||

  (

    this.answers[
      this.current
    ] === "correct"

    &&

    i === q.a
  )

){

  btn.classList.add(
    "selected"
  );
}

// CLICK

btn.onclick = ()=>{

  // LOCK IF CORRECT

  if(
    this.answers[
      this.current
    ]
    === "correct"
  ){
    return;
  }

  
this.selectedAnswers[
  this.current
] = i;
  this.renderQuestion();
};

options.appendChild(btn);

});
},
/* =========================
TRUE FALSE
========================= */

renderTrueFalse:function(q){

  questionText.innerHTML =
    q.q;

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.style.display =
    "grid";

  wrapper.style.gap =
    "20px";

  q.opt.forEach((text,i)=>{

    const row =
      document.createElement(
        "div"
      );

    row.style.display =
      "flex";

    row.style.justifyContent =
      "space-between";

    row.style.alignItems =
      "center";

    row.style.gap =
      "20px";

    // TEXT

    const content =
      document.createElement(
        "div"
      );

    content.style.flex = 1;

    content.innerHTML =
      text;

    // ACTIONS

    const actions =
      document.createElement(
        "div"
      );

    actions.style.display =
      "flex";

    actions.style.gap =
      "10px";

    // TRUE BTN

    const trueBtn =
      document.createElement(
        "button"
      );

    trueBtn.innerHTML = "Đ";

    // FALSE BTN

    const falseBtn =
      document.createElement(
        "button"
      );

    falseBtn.innerHTML = "S";

    // LOAD SELECTED

    const selected =

      this.selectedAnswers[
        this.current
      ] || [];

    const currentValue =
      selected[i];

    // SELECTED UI

    if(
      currentValue === true
    ){
      trueBtn.classList.add(
        "selected"
      );
    }

    if(
      currentValue === false
    ){
      falseBtn.classList.add(
        "selected"
      );
    }

    // QUESTION STATE

    const states =

  this.trueFalseStates[
    this.current
  ] || {};

const itemState =
  states[i];

// CORRECT

if(
  itemState === "correct"
){

  if(q.a[i] === true){

    trueBtn.classList.add(
      "correct"
    );

  }else{

    falseBtn.classList.add(
      "correct"
    );
  }
}

    // FLASH WRONG

    if(
  itemState === "wrong"
){

  if(
    currentValue !== q.a[i]
  ){

    if(currentValue === true){

      trueBtn.classList.add(
        "wrong"
      );

    }else{

      falseBtn.classList.add(
        "wrong"
      );
    }
  }
}

    // CLICK TRUE

    trueBtn.onclick = ()=>{

  if(
    itemState === "correct"
  ){
    return;
  }

  this.selectTrueFalse(
    i,
    true
  );
};

    // CLICK FALSE

    falseBtn.onclick = ()=>{

  if(
    itemState === "correct"
  ){
    return;
  }

  this.selectTrueFalse(
    i,
    false
  );
};

    actions.appendChild(
      trueBtn
    );

    actions.appendChild(
      falseBtn
    );

    row.appendChild(
      content
    );

    row.appendChild(
      actions
    );

    wrapper.appendChild(
      row
    );
  });

  options.appendChild(
    wrapper
  );
},

selectTrueFalse:function(index,value){

  if(
    !this.selectedAnswers[
      this.current
    ]
  ){

    this.selectedAnswers[
      this.current
    ] = [];
  }

  this.selectedAnswers[
    this.current
  ][index] = value;

  this.renderQuestion();
},
  
/* =========================
CHECK
========================= */
  
checkAnswer:function(){
const q =
this.questions[
this.current
];
// ROUTER
switch(q.type){
    
case "truefalse":
  this.checkTrueFalse(q);
  break;
    
case "single":
  this.checkSingle(q);
  break;
}
},
/* =========================
TRUE FALSE CHECK
========================= */

checkTrueFalse:async function(q){
const questionState =

  this.answers[
    this.current
  ];

if(
  questionState
  === "correct"
){
  return;
}
  const selected =

    this.selectedAnswers[
      this.current
    ] || [];

  // INIT

  if(
    !this.trueFalseStates[
      this.current
    ]
  ){

    this.trueFalseStates[
      this.current
    ] = {};
  }

  let allCorrect = true;

  let allWrong = true;

  q.a.forEach((answer,i)=>{

    const state =

      this.trueFalseStates[
        this.current
      ][i];

    // LOCK CORRECT

    if(
      state === "correct"
    ){
      return;
    }

    // NOT ANSWERED

    if(
      selected[i]
      == null
    ){

      allCorrect = false;

      allWrong = false;

      return;
    }

    // CORRECT
if(
  !this.trueFalseScored[
    this.current
  ]
){
  this.trueFalseScored[
    this.current
  ] = {};
}
    if(
  selected[i]
  === answer
){

  this.trueFalseStates[
    this.current
  ][i] = "correct";

  if(
    !this.trueFalseScored[
      this.current
    ][i]
  ){

    this.score += 5;

    this.trueFalseScored[
      this.current
    ][i] = true;
  }

}else{

  this.trueFalseStates[
    this.current
  ][i] = "wrong";
      clearTimeout(

  this.wrongTimeouts[
    this.current + "_" + i
  ]
);
      
this.wrongTimeouts[
  this.current + "_" + i
] = setTimeout(()=>{
  if(
    this.trueFalseStates[
      this.current
    ]
  ){

    this.trueFalseStates[
      this.current
    ][i] = null;
  }

  if(
    this.selectedAnswers[
      this.current
    ]
  ){

    this.selectedAnswers[
      this.current
    ][i] = null;
  }

  this.renderQuestion();

},500);
  if(
    !this.trueFalseScored[
      this.current
    ][i]
  ){

    this.score -= 5;

    this.trueFalseScored[
      this.current
    ][i] = true;
  }

  allCorrect = false;
}

    // IF ANY CORRECT
    // => NOT ALL WRONG

    if(
      selected[i]
      === answer
    ){
      allWrong = false;
    }
  });

  // NAV STATE

  if(allCorrect){

    this.answers[
      this.current
    ] = "correct";

  }else if(allWrong){

    this.answers[
      this.current
    ] = "wrong";

  }else{

    delete this.answers[
      this.current
    ];
  }

  // BEST SCORE

  if(
    this.score >
    this.bestScore
  ){

    this.bestScore =
      this.score;
  }

  // UPDATE

  this.updateScore();

  this.renderQuestion();

  this.renderNav();

  // SAVE

  this.unsavedChanges++;

  this.saveProgress();

  if(
    this.unsavedChanges >= 5
  ){

    this.saveCloudProgress();

    this.unsavedChanges = 0;
  }
  await this.checkLessonComplete();
},
/* =========================
SINGLE CHECK
========================= */

checkSingle:async function(q){

if(
this.selectedAnswers[
  this.current
] == null
){
return;
}

// LOCK

if(
this.answers[
this.current
]
=== "correct"
){
return;
}

// CORRECT

if(
this.selectedAnswers[
  this.current
] === q.a
){


this.answers[
  this.current
] = "correct";

this.score += 20;


}else{


this.answers[
  this.current
] = "wrong";

this.score -= 5;
this.flashWrong[
  this.current
] = true;

setTimeout(()=>{

  this.flashWrong[
    this.current
  ] = false;

  this.renderQuestion();

},500);

}

// BEST SCORE

if(
this.score >
this.bestScore
){

this.bestScore =
  this.score;

}

// UPDATE UI

this.updateScore();

this.renderQuestion();

this.renderNav();

// SAVE

this.unsavedChanges++;

this.saveProgress();

if(
this.unsavedChanges >= 5
){


this.saveCloudProgress();

this.unsavedChanges = 0;

}
await this.checkLessonComplete();
},
/* =========================
COMPLETE
========================= */

checkLessonComplete:async function(){

  const totalCorrect =

    Object.values(
      this.answers
    )

    .filter(
      v=>v==="correct"
    )

    .length;

  if(
    totalCorrect
    !==
    this.questions.length
  ){
    return;
  }

  // AVOID DUPLICATE

  if(this.completed){
    return;
  }

  // COMPLETE

  this.completed = true;

  // FIRST SCORE

  if(
    this.firstScore
    === null
  ){

    this.firstScore =
      this.score;
  }
// NFT ELIGIBLE
// FIRST COMPLETION

await this.saveCertificateState({

  certificateEligible:true,

  certificateMinted:false

});
  await this.renderCertificateButton();
  // SAVE

  this.saveProgress();

  await this.saveCloudProgress();

  // UNLOCK RETRY
  // ONLY AFTER CLOUD SAVE

  retryBtn.style.display =
    "inline-block";
},
  /* =========================
     NAV
  ========================= */

  renderNav:function(){

    navBar.innerHTML = "";

    this.questions
    .forEach((q,i)=>{

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "nav-item";

      div.innerText =
        i+1;

     if(i === this.current){

  div.style.background =
    "#FFC107";

  div.style.color =
    "black";
}

if(
  this.answers[i]
  === "wrong"
){

  div.style.background =
    "#F44336";

  div.style.color =
    "white";
}

if(
  this.answers[i]
  === "correct"
){

  div.style.background =
    "#4CAF50";

  div.style.color =
    "white";
}

      div.onclick = ()=>{

        this.current = i;

        this.saveProgress();

        this.renderQuestion();

        this.renderNav();
      };

      navBar.appendChild(div);

    });

  },
/* =========================
   LOAD CLOUD
========================= */

loadCloudProgress:async function(){

  try{

    const uid =
      localStorage.getItem(
        "uid"
      );

    if(!uid) return;

    const ref =

      doc(

        db,

        "users",

        uid,

        "lessons",

        this.lessonId

      );

    const snap =
      await getDoc(ref);

    if(!snap.exists()){

      this.cloudLoaded = true;

      return;
    }

    const data =
      snap.data();

    // LOCAL FIRST

    const localRaw =

      localStorage.getItem(
        this.saveKey
      );

    if(localRaw){

      this.cloudLoaded = true;

      return;
    }

    this.current =
      data.current || 0;

    this.score =
      data.score || 150;

    this.answers =
      data.answers || {};
    this.selectedAnswers =
  data.selectedAnswers || {};
    this.hints =
  data.hints || {};
    this.hiddenOptions =
  data.hiddenOptions || {};
    this.trueFalseStates =
  data.trueFalseStates || {};
    this.trueFalseScored =
  data.trueFalseScored || {};
this.bestScore =
  data.bestScore || this.score;

this.firstScore =
  data.firstScore || null;

this.completed =
  data.completed || false;
    this.certificateMinted =
 data.certificateMinted || false;

this.mintedScore =
 data.mintedScore || null;

this.mintedRank =
 data.mintedRank || null;

this.mintedAt =
 data.mintedAt || null;

this.mintedTokenId =
 data.mintedTokenId || null;

this.metadataURI =
 data.metadataURI || null;
    this.cloudLoaded = true;

  }catch(err){

    console.error(
      "CLOUD LOAD ERROR",
      err
    );
  }
},
  /* =========================
     LOAD PROGRESS
  ========================= */

  loadProgress:function(){

    const raw =

      localStorage.getItem(
        this.saveKey
      );

    if(!raw) return;

    try{

      const data =
        JSON.parse(raw);

      this.current =
        data.current || 0;

      this.score =
        data.score
        || this.score;

this.answers =
  data.answers || {};
this.selectedAnswers =
  data.selectedAnswers || {};
this.hints =
  data.hints || {};
this.hiddenOptions =
  data.hiddenOptions || {};
this.trueFalseStates =
  data.trueFalseStates || {};
this.trueFalseScored =
  data.trueFalseScored || {};
this.bestScore =
  data.bestScore || this.score;;
this.firstScore =
  data.firstScore || null;
this.completed =
  data.completed || false;
this.certificateMinted =
 data.certificateMinted || false;
this.mintedScore =
 data.mintedScore || null;
this.mintedRank =
 data.mintedRank || null;
this.mintedAt =
 data.mintedAt || null;
this.mintedTokenId =
 data.mintedTokenId || null;
this.metadataURI =
 data.metadataURI || null;
    }catch(err){
      console.error(
        "LOAD PROGRESS ERROR",
        err
      );
    }
  },
/* =========================
   SAVE CLOUD
========================= */

saveCloudProgress:async function(){

  try{

    const uid =
      localStorage.getItem(
        "uid"
      );

    if(!uid) return;

    const ref =

      doc(

        db,

        "users",

        uid,

        "lessons",

        this.lessonId

      );

    await setDoc(

      ref,

      {

        current:
          this.current,
        score:
          this.score,
        answers:
          this.answers,
        selectedAnswers:
          this.selectedAnswers,
        hints:
          this.hints,
        hiddenOptions:
          this.hiddenOptions,
        trueFalseStates:
          this.trueFalseStates,
        trueFalseScored:
          this.trueFalseScored,
        bestScore:
          this.bestScore,
        firstScore:
          this.firstScore,
        completed:
          this.completed,
certificateMinted:
  this.certificateMinted,
mintedScore:
 this.mintedScore,
mintedRank:
 this.mintedRank,
mintedAt:
 this.mintedAt,
mintedTokenId:
 this.mintedTokenId,
metadataURI:
 this.metadataURI,
        updatedAt:
          serverTimestamp()

      },

      {
        merge:true
      }

    );

  }catch(err){

    console.error(
      "CLOUD SAVE ERROR",
      err
    );
  }
},


  saveCertificateState:
async function(data){

  try{

    const uid =
      localStorage.getItem(
        "uid"
      );

    if(!uid) return;

    const ref =

      doc(
        db,
        "users",
        uid,
        "lessons",
        this.lessonId
      );

    await setDoc(

      ref,

      data,

      {
        merge:true
      }

    );

  }catch(err){

    console.error(
      "CERT SAVE ERROR",
      err
    );
  }
},
  /* =========================
     SAVE PROGRESS
  ========================= */
  saveProgress:function(){

    localStorage.setItem(

      this.saveKey,

      JSON.stringify({
        current:
   this.current,
        score:
  this.score,
        answers:
  this.answers,
        selectedAnswers:
  this.selectedAnswers,
        hints:
  this.hints,
        hiddenOptions:
  this.hiddenOptions,
        trueFalseStates:
  this.trueFalseStates,
        trueFalseScored:
   this.trueFalseScored,
        bestScore:
  this.bestScore,
        firstScore:
   this.firstScore,
        completed:
  this.completed,
        certificateMinted:
  this.certificateMinted,
        mintedScore:
  this.mintedScore,
        mintedRank:
  this.mintedRank,
        mintedAt:
 this.mintedAt,
        mintedTokenId:
 this.mintedTokenId,
        metadataURI:
 this.metadataURI,
      })

    );
  },



 /* =========================
    hint
  ========================= */
 useHint:function(){
const q =
  this.questions[
    this.current
  ];
   // SINGLE
if(
  q.type === "single"
  &&
  this.answers[
    this.current
  ] === "correct"
){
  return;
}
   
   // TRUE FALSE
if(
  q.type === "truefalse"
){
  const states =
    this.trueFalseStates[
      this.current
    ] || {};
  const allCorrect =
    q.a.every(
      (_,i)=>
      states[i]
      ===
      "correct"
    );
  if(allCorrect){
    return;
  }
}

  // ALREADY USED

  if(
    this.hints[
      this.current
    ]
  ){
    return;
  }

  let used = false;

  // SINGLE

  if(
    q.type === "single"
  ){

    this.singleHint(q);

    used = true;
  }

  // TRUE FALSE

  if(
    q.type === "truefalse"
  ){

    this.trueFalseHint(q);

    used = true;
  }

  // ONLY COST
  // IF HINT WORKED

if(used){

  // SINGLE
  if(
    q.type === "single"
  ){
    this.score -= 6;
  }

  // TRUE FALSE
  if(
    q.type === "truefalse"
  ){
    this.score -= 3;
  }


  
    this.hints[
      this.current
    ] = true;

    this.updateScore();

    this.saveProgress();
  this.unsavedChanges++;

if(
  this.unsavedChanges >= 5
){

  this.saveCloudProgress();

  this.unsavedChanges = 0;
}
  }
},

singleHint:function(q){

  let wrongIndexes = [];

  q.opt.forEach((_,i)=>{

    if(i !== q.a){

      wrongIndexes.push(i);
    }
  });

  // SHUFFLE

  wrongIndexes.sort(
    ()=>Math.random()-0.5
  );

  // SAVE HIDDEN

  this.hiddenOptions[
    this.current
  ] = wrongIndexes.slice(0,2);

  this.renderQuestion();
},


  
  trueFalseHint:function(q){

  // FIND FIRST
  // UNANSWERED ITEM

  const selected =

    this.selectedAnswers[
      this.current
    ] || [];

  for(
    let i=0;
    i<q.a.length;
    i++
  ){

    if(
      selected[i]
      == null
    ){

      // AUTO REVEAL

      selected[i] =
        q.a[i];

      this.selectedAnswers[
        this.current
      ] = selected;

      break;
    }
  }

  this.renderQuestion();
},

  
  /* =========================
    SCORE
  ========================= */

  updateScore:function(){

   this.rank = getTier(this.bestScore);

  scoreValue.innerText =
    this.score;

  bestScoreValue.innerText =
    this.bestScore;

  rankValue.innerText =
    this.rank;
}};
/* =========================
   GLOBAL
========================= */

window.checkAnswer =
function(){

  lessonEngine.checkAnswer();
};

window.goBack =
async function(){

  await lessonEngine
    .saveCloudProgress();

  showToast(
    "📤 Đã nộp bài!"
  );

  setTimeout(()=>{

    window.location.href =
      "home.html#courses";

  },400);
};

window.showHint = function(){

  lessonEngine.useHint();
};


window.retryLesson = async function(){
  lessonEngine.score =
    lessonEngine.config
      .startScore;

  lessonEngine.answers = {};
  navBar.innerHTML = "";
  lessonEngine.current = 0;
  lessonEngine.selectedAnswers = {};

  lessonEngine.hints = {};

  lessonEngine.hiddenOptions = {};

  lessonEngine.flashWrong = {};

  lessonEngine.trueFalseStates = {};
  lessonEngine.trueFalseScored = {};
  lessonEngine.wrongTimeouts = {};
  lessonEngine.unsavedChanges = 0;
  // KEEP:
  // bestScore
  // firstScore
  // completed

  lessonEngine.saveProgress();
  await lessonEngine.saveCloudProgress();
  options.innerHTML = "";
  lessonEngine.renderQuestion();

  lessonEngine.renderNav();

  lessonEngine.updateScore();

  showToast(
    "🔄 Đã reset bài làm!"
  );
};
