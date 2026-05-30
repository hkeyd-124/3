/* =========================
   TOAST
========================= */

window.showToast =
function(

  message,

  type = "success"

){

  const toast =
    document.createElement(
      "div"
    );

  /* =========================
     STYLE
  ========================= */

  toast.style.position =
    "fixed";

  toast.style.top =
    "20px";

  toast.style.right =
    "20px";

  toast.style.padding =
    "14px 18px";

  toast.style.borderRadius =
    "14px";

  toast.style.color =
    "white";

  toast.style.fontWeight =
    "bold";

  toast.style.zIndex =
    "999999";

  toast.style.boxShadow =
    "0 10px 30px rgba(0,0,0,0.15)";

  toast.style.opacity =
    "0";

  toast.style.transform =
    "translateY(-10px)";

  toast.style.transition =
    "all 0.25s ease";

  /* =========================
     COLORS
  ========================= */

  if(type === "success"){

    toast.style.background =
      "#4CAF50";
  }

  else if(type === "error"){

    toast.style.background =
      "#F44336";
  }

  else if(type === "warning"){

    toast.style.background =
      "#FF9800";
  }

  else{

    toast.style.background =
      "#111";
  }

  toast.innerText =
    message;

  document.body.appendChild(
    toast
  );

  /* =========================
     ANIMATION IN
  ========================= */

  requestAnimationFrame(()=>{

    toast.style.opacity =
      "1";

    toast.style.transform =
      "translateY(0)";
  });

  /* =========================
     REMOVE
  ========================= */

  setTimeout(()=>{

    toast.style.opacity =
      "0";

    toast.style.transform =
      "translateY(-10px)";

    setTimeout(()=>{

      toast.remove();

    },250);

  },2500);
}
