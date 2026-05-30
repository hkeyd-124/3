/* =========================
   GLOBAL APP STATE
========================= */

window.APP_STATE = {

  /* USER */

  user:null,

  /* NAVIGATION */

  currentTab:"home",

  /* LEADERBOARD */

  leaderboard:[],

  /* COURSES */

  courses:{},

  /* RESOURCES */

  resources:{},

  /* UI */

  ui:{

    loading:false,

    modalOpen:false,

    sidebarCollapsed:false

  }

};

/* =========================
   SET STATE
========================= */

window.setState =
function(key,value){

  APP_STATE[key] = value;

  console.log(

    "APP STATE:",
    APP_STATE

  );
}

/* =========================
   GET STATE
========================= */

window.getState =
function(key){

  return APP_STATE[key];
}

/* =========================
   UPDATE USER STATE
========================= */

window.setUserState =
function(user){

  APP_STATE.user = user;

  console.log(

    "USER STATE:",
    user

  );
}
