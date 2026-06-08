window.AI_STATE = {

  mode: "home",

  messages: [],

  currentQuiz: null,

  quizScore: 0,

  quizAnswered: false,
    
  quizHistory:[]

};

try{

  const savedMessages =

    localStorage.getItem(
      "hackchem_ai_messages"
    );

  if(savedMessages){

    AI_STATE.messages =
      JSON.parse(savedMessages);
  }

}catch(err){

  console.error(err);

}
