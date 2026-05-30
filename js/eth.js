/* =========================
   ETH BALANCE
========================= */

window.loadETHBalance =
async function(){

  try{

    const balanceEl =
      document.getElementById(
        "ethBalance"
      );

    const iconEl =
      document.getElementById(
        "ethIcon"
      );

    if(
      !balanceEl ||
      !iconEl
    ) return;

    const wallet =
      localStorage.getItem(
        "wallet"
      );

    if(!wallet){

      iconEl.innerText = "🦊";

      balanceEl.innerText =
        "No wallet";

      return;
    }

    if(!window.ethereum){

      iconEl.innerText = "⚠️";

      balanceEl.innerText =
        "No provider";

      return;
    }

    /* =========================
       GET BALANCE
    ========================= */

    const balanceWei =

      await ethereum.request({

        method:
          "eth_getBalance",

        params:[
          wallet,
          "latest"
        ]
      });

    const eth =

      parseInt(
        balanceWei,
        16
      )

      /

      1e18;

    /* =========================
       RENDER
    ========================= */

   iconEl.innerHTML = `
<svg width="14" height="14" viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg">
  <path fill="#343434"
    d="M127.9 0L124.7 10.9V279.1L127.9 282.3L255.8 210.7Z"/>
  <path fill="#8C8C8C"
    d="M127.9 0L0 210.7L127.9 282.3V150.1Z"/>
  <path fill="#3C3C3B"
    d="M127.9 306.8L126.1 309V414.2L127.9 416.9L255.9 235.3Z"/>
  <path fill="#8C8C8C"
    d="M127.9 416.9V306.8L0 235.3Z"/>
  <path fill="#141414"
    d="M127.9 282.3L255.8 210.7L127.9 150.1Z"/>
  <path fill="#393939"
    d="M0 210.7L127.9 282.3V150.1Z"/>
</svg>
`;

    balanceEl.innerText =

      eth.toFixed(4)

      +

      " ETH";

  }catch(err){

    console.error(
      "ETH ERROR:",
      err
    );
  }
}

/* =========================
   REALTIME
========================= */

window.startETHRealtime =
function(){

  loadETHBalance();

  setInterval(

    loadETHBalance,

    30000
  );
}

/* =========================
   FAUCET MODAL
========================= */

window.openFaucetModal =
function(){

  document
    .getElementById(
      "faucetModal"
    )
    .style.display =
      "flex";
}

window.closeFaucetModal =
function(){

  document
    .getElementById(
      "faucetModal"
    )
    .style.display =
      "none";
}

window.openFaucet =
function(url){

  window.open(
    url,
    "_blank"
  );
}
