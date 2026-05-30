/* =========================
   SHOW LOADING
========================= */

window.showLoading =
function(

  text = "Loading..."

){

  let overlay =
    document.getElementById(
      "globalLoading"
    );

  /* EXISTS */

  if(overlay){

    overlay.style.display =
      "flex";

    const label =
      document.getElementById(
        "loadingText"
      );

    if(label){

      label.innerText =
        text;
    }

    return;
  }

  /* CREATE */

  overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "globalLoading";

  overlay.style.position =
    "fixed";

  overlay.style.inset =
    "0";

  overlay.style.background =
    "rgba(0,0,0,0.45)";

  overlay.style.backdropFilter =
    "blur(4px)";

  overlay.style.display =
    "flex";

  overlay.style.flexDirection =
    "column";

  overlay.style.justifyContent =
    "center";

  overlay.style.alignItems =
    "center";

  overlay.style.zIndex =
    "999999";

  /* SPINNER */

  const spinner =
    document.createElement(
      "div"
    );

  spinner.style.width =
    "70px";

  spinner.style.height =
    "70px";

  spinner.style.border =
    "7px solid rgba(255,255,255,0.2)";

  spinner.style.borderTop =
    "7px solid white";

  spinner.style.borderRadius =
    "50%";

  spinner.style.animation =
    "spin 1s linear infinite";

  /* TEXT */

  const label =
    document.createElement(
      "div"
    );

  label.id =
    "loadingText";

  label.innerText =
    text;

  label.style.marginTop =
    "20px";

  label.style.color =
    "white";

  label.style.fontSize =
    "18px";

  label.style.fontWeight =
    "bold";

  /* STYLE */

  const style =
    document.createElement(
      "style"
    );

  style.innerHTML = `

    @keyframes spin{

      from{
        transform:rotate(0deg);
      }

      to{
        transform:rotate(360deg);
      }
    }

  `;

  document.head.appendChild(
    style
  );

  overlay.appendChild(
    spinner
  );

  overlay.appendChild(
    label
  );

  document.body.appendChild(
    overlay
  );
}

/* =========================
   HIDE LOADING
========================= */

window.hideLoading =
function(){

  const overlay =
    document.getElementById(
      "globalLoading"
    );

  if(overlay){

    overlay.style.display =
      "none";
  }
}
