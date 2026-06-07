window.openAITutor = function(){

  AI_STATE.mode = "chat";

  document.getElementById(
    "aiHomeView"
  ).style.display = "none";

  document.getElementById(
    "aiTutorView"
  ).style.display = "block";

  /* WELCOME MESSAGE */

  if(
    AI_STATE.messages.length === 0
  ){

    AI_STATE.messages.push({

      role:"assistant",

      content:
`Xin chào!

Tôi là AI Tutor của HackChem.

Tôi có thể giúp bạn:

📘 Giải thích lý thuyết hóa học

🧪 Viết và cân bằng phương trình phản ứng

📊 Giải bài tập hóa học

🎯 Ôn tập và kiểm tra kiến thức

Hãy đặt câu hỏi bên dưới.`

    });

  }

  renderMessages();

  document
    .getElementById(
      "aiInput"
    )
    ?.focus();
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

      const label =

        msg.role === "user"

        ? "🧑 You"

        : "🤖 AI Tutor";

      const time =

        msg.time

        ? new Date(
            msg.time
          ).toLocaleTimeString(
            [],
            {
              hour:"2-digit",
              minute:"2-digit"
            }
          )

        : "";

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

      div.innerHTML = `

  <div
    style="
    font-weight:bold;
    margin-bottom:6px;
    ">

    ${label}

  </div>

  <div
    style="
    white-space:pre-line;
    line-height:1.7;
    ">

    ${msg.content}

  </div>

  <div
    style="
    margin-top:8px;
    font-size:12px;
    opacity:.7;
    ">

    ${time}

  </div>

`;

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

  content:text,

  time: Date.now()

});
  AI_STATE.messages.push({

  role:"assistant",

  content:"⏳ Thinking...",

  time: Date.now()

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
