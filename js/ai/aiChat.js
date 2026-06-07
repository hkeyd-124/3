window.openAITutor = function(){

  AI_STATE.mode = "chat";

  document.getElementById(
    "aiHomeView"
  ).style.display = "none";

  document.getElementById(
    "aiTutorView"
  ).style.display = "block";

  renderMessages();
};

window.backToAIHome = function(){

  AI_STATE.mode = "home";

  document.getElementById(
    "aiTutorView"
  ).style.display = "none";

  document.getElementById(
    "aiHomeView"
  ).style.display = "block";
};

function renderMessages(){

  const box =
    document.getElementById(
      "aiMessages"
    );

  if(!box) return;

  box.innerHTML = "";

  AI_STATE.messages.forEach(
    msg=>{

      const div =
        document.createElement(
          "div"
        );

      div.style.margin =
        "12px 0";

      div.style.padding =
        "12px";

      div.style.borderRadius =
        "14px";

      if(msg.role==="user"){

        div.style.background =
          "#111";

        div.style.color =
          "white";

        div.style.marginLeft =
          "80px";

      }else{

        div.style.background =
          "#f1f5f9";

        div.style.marginRight =
          "80px";
      }

      div.innerText =
        msg.content;

      box.appendChild(div);
    }
  );

  box.scrollTop =
    box.scrollHeight;
}

function sendMessage(){

  const input =
    document.getElementById(
      "aiInput"
    );

  if(!input) return;

  const text =
    input.value.trim();

  if(!text) return;

  AI_STATE.messages.push({

    role:"user",

    content:text

  });

  renderMessages();

  input.value = "";
}

document.addEventListener(

  "click",

  e=>{

    if(
      e.target.id ===
      "aiSendBtn"
    ){

      sendMessage();
    }
  }
);

document.addEventListener(

  "keypress",

  e=>{

    if(
      e.key === "Enter"
      &&
      document.activeElement?.id
      === "aiInput"
    ){

      sendMessage();
    }
  }
);
