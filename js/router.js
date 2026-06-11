/* =========================
   GLOBAL
========================= */

window.currentTab = "home";

window.tabCache = {};

/* =========================
   ACTIVE MENU
========================= */

window.setActiveMenu = function(id){

  document.querySelectorAll(
    ".menu-item"
  )

  .forEach(el=>{

    el.classList.remove(
      "active"
    );

  });

  const menu =
    document.getElementById(
      `menu-${id}`
    );

  if(menu){

    menu.classList.add(
      "active"
    );
  }
}

/* =========================
   HOME
========================= */

window.loadHome = function(

  push = true

){

  window.currentTab = "home";

  setActiveMenu("home");

  document.getElementById(
    "homeContent"
  ).style.display = "block";

  document.getElementById(
    "spaContainer"
  ).style.display = "none";

  /* URL */

  if(push){

    history.pushState(

      {
        tab:"home"
      },

      "",

      "home.html"

    );
  }
}

/* =========================
   LOAD TAB
========================= */

window.loadTab =
async function(

  tab,
  push = true

){

  try{

    window.currentTab = tab;

    setActiveMenu(tab);

    document.getElementById(
      "homeContent"
    ).style.display = "none";

    const container =
      document.getElementById(
        "spaContainer"
      );

    container.style.display =
      "block";

    container.innerHTML = `

      <div class="loading-box">
        ⏳ Loading ${tab}...
      </div>

    `;

    /* =========================
       CACHE
    ========================= */

    if(window.tabCache[tab]){

      container.innerHTML =
        window.tabCache[tab];

    }else{

      const res =
        await fetch(
          `tabs/${tab}.html`
        );

      if(!res.ok){

        throw new Error(
          `Cannot load ${tab}`
        );
      }

      const html =
        await res.text();

      window.tabCache[tab] =
        html;

      container.innerHTML =
        html;
    }

    /* =========================
       URL
    ========================= */

    if(push){

      history.pushState(

        {
          tab
        },

        "",

        `home.html#${tab}`

      );
    }

    /* =========================
       TAB INIT
    ========================= */

    if(tab === "courses"){

  renderCourses();

  bindCourseEvents();

  bindBossEvents();

  applyCourseProgress();
}

    if(tab === "leaderboard"){

  setTimeout(()=>{

    loadTopics();

    loadLessons();

  },100);
}

  }catch(err){

    console.error(err);

    document.getElementById(
      "spaContainer"
    ).innerHTML = `

      <div class="loading-box">
        ❌ Cannot load ${tab}
      </div>

    `;
  }
}

/* =========================
   HANDLE BACK BUTTON
========================= */

window.addEventListener(

  "popstate",

  async ()=>{

    const hash =
      window.location.hash
      .replace("#","");

    if(!hash){

      loadHome(false);

      return;
    }

    await loadTab(
      hash,
      false
    );
  }
);

/* =========================
   INITIAL LOAD
========================= */

window.addEventListener(

  "DOMContentLoaded",

  async ()=>{

    const hash =
      window.location.hash
      .replace("#","");

    if(!hash){

      loadHome(false);

      return;
    }

    await loadTab(
      hash,
      false
    );
  }
);
