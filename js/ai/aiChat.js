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
`Xin chào! Tôi là AI Tutor của HackChem.<br><br>
Tôi có thể giúp bạn:<br>
📘 Giải thích lý thuyết hóa học<br>
🧪 Viết và cân bằng phương trình phản ứng<br>
📊 Giải bài tập hóa học<br>
🎯 Ôn tập và kiểm tra kiến thức<br><br>
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

      const contentId =

  "msg_" +
  Math.random()
    .toString(36)
    .slice(2);

div.innerHTML = `

  <div
    style="
    font-weight:bold;
    margin-bottom:6px;
    ">

    ${label}

  </div>

  <div id="${contentId}">

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
if(

  window.renderMathInElement

){

  renderMathInElement(

    document.getElementById(
      contentId
    ),

    {

      delimiters:[

        {
          left:"$$",
          right:"$$",
          display:true
        },

        {
          left:"$",
          right:"$",
          display:false
        }

      ]

    }

  );

}
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
localStorage.setItem(

  "hackchem_ai_messages",

  JSON.stringify(
    AI_STATE.messages
  )

);


  
  const thinkingIndex =

  AI_STATE.messages.push({

    role:"assistant",

    content:"⏳ Thinking...",

    time: Date.now()

  }) - 1;
  
localStorage.setItem(

  "hackchem_ai_messages",

  JSON.stringify(
    AI_STATE.messages
  )
);
  
renderMessages();

  
console.log(
  katex.renderToString(
    "H_2SO_4"
  )
);

  
input.value = "";

fetch(

  "/api/ai-chat",

  {

    method:"POST",

    headers:{

      "Content-Type":
        "application/json"

    },

    body:JSON.stringify({

      message:text

    })

  }

)

.then(

  res=>res.json()

)

.then(

  data=>{

    AI_STATE.messages[
      thinkingIndex
    ] = {

      role:"assistant",

      content:
  (data.answer || "No response")

    .replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    )

    .replace(
      /\n/g,
      "<br>"
    ),

      time:Date.now()

    };

    localStorage.setItem(

  "hackchem_ai_messages",

  JSON.stringify(
    AI_STATE.messages
  )

);
  
    
    renderMessages();
  }
)
.catch(
  err=>{
    console.error(err);
    AI_STATE.messages[
      thinkingIndex
    ] = {
      role:"assistant",
      content:
        "❌ Failed to connect to AI",
      time:Date.now()
    };
    
localStorage.setItem(
  "hackchem_ai_messages",
  JSON.stringify(
    AI_STATE.messages
  )
);
    
    renderMessages();

  }

);
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
