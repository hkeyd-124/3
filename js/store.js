/* =========================
   GLOBAL APP STATE
========================= */

window.appState = {

  user:null,

  wallet:null,

  username:null,

  currentTab:"home"

};

/* =========================
   INIT USER
========================= */

window.initUserState = function(){

  const uid =
    localStorage.getItem("uid");

  const wallet =
    localStorage.getItem("wallet");

  const username =
    localStorage.getItem("username");

  window.appState.user = uid;

  window.appState.wallet = wallet;

  window.appState.username = username;

  console.log(
    "APP STATE:",
    window.appState
  );
}

/* =========================
   SET TAB
========================= */

window.setCurrentTab =
function(tab){

  window.appState.currentTab =
    tab;
}

/* =========================
   GET UID
========================= */

window.getUID = function(){

  return (
    window.appState.user ||

    localStorage.getItem("uid") ||

    "guest"
  );
}

/* =========================
   GET WALLET
========================= */

window.getWallet = function(){

  return (

    window.appState.wallet ||

    localStorage.getItem("wallet") ||

    "guest"

  );
}

/* =========================
   GET USERNAME
========================= */

window.getUsername = function(){

  return (

    window.appState.username ||

    localStorage.getItem("username") ||

    "Guest"

  );
}

/* =========================
   INIT
========================= */

window.initUserState();
