window.fullWalletDisconnect =
async function(){

  try{

    // =========================
    // REOWN / WALLETCONNECT
    // =========================

    if(window.modal){

      try{

        await window.modal.disconnect();

        await window.modal.clearStorage();
await new Promise(
  resolve=>setTimeout(
    resolve,
    1500
  )
);
      }catch(e){

        console.log(
          "modal disconnect fail"
        );
      }

    }

    // =========================
    // CLEAR STORAGE
    // =========================

    localStorage.removeItem(
      "wallet"
    );

    localStorage.removeItem(
      "uid"
    );

    sessionStorage.clear();

    // 🔥 WalletConnect cache

    Object.keys(localStorage)
    .forEach(key=>{

      if(

        key.includes("walletconnect")

        ||

        key.includes("WALLETCONNECT")

        ||

        key.includes("wc@2")

        ||

        key.includes("reown")

      ){

        localStorage.removeItem(
          key
        );
      }

    });
localStorage.setItem(
  "manual_disconnect",
  "true"
);
    // =========================
    // REDIRECT
    // =========================

    window.location.href =
      "index.html";

  }catch(err){

    console.error(err);

    window.location.href =
      "index.html";
  }

}
