import {
    loadNotifications
} from "./notifications.js";
/* =========================
   ADMIN ROUTER
========================= */

const routes = {
    dashboard: {
        title: "Dashboard",
        content: `
            <h2>Admin Dashboard</h2>
            <p>Dashboard functionality will be added in a future phase.</p>
        `
    },

    notifications: {
        title: "Notifications",
        load: loadNotifications
    },

    users: {
        title: "Users",
        content: `
            <h2>Users</h2>
            <p>User management will be added in a future phase.</p>
        `
    },

    system: {
        title: "System",
        content: `
            <h2>System</h2>
            <p>System controls will be added in a future phase.</p>
        `
    },

    analytics: {
        title: "Analytics",
        content: `
            <h2>Analytics</h2>
            <p>Analytics will be added in a future phase.</p>
        `
    },

    logs: {
        title: "Logs",
        content: `
            <h2>Logs</h2>
            <p>Logs will be added in a future phase.</p>
        `
    }
};

/* =========================
   GET CURRENT ROUTE
========================= */

function getCurrentRoute() {

    const hash =
        window.location.hash
            .replace("#", "")
            .trim();

    if (routes[hash]) {
        return hash;
    }

    return "dashboard";
}


/* =========================
   SET ACTIVE MENU
========================= */

function setActiveMenu(route) {

    document
        .querySelectorAll(".menu-item")
        .forEach(menu => {

            menu.classList.remove("active");

        });

    const activeMenu =
        document.getElementById(`menu-${route}`);

    if (activeMenu) {
        activeMenu.classList.add("active");
    }
}


/* =========================
   LOAD ROUTE
========================= */

function loadRoute(route, push = true) {

    const routeData = routes[route];

    if (!routeData) {
        route = "dashboard";
    }

    const data = routes[route];

    const content =
        document.getElementById("adminContent");

    const pageTitle =
        document.getElementById("pageTitle");

    if (!content || !pageTitle) {
        console.error(
            "Admin Router: required elements not found."
        );

        return;
    }

    /* =========================
       ACTIVE MENU
    ========================= */

    setActiveMenu(route);


    /* =========================
       PAGE TITLE
    ========================= */

    pageTitle.textContent =
        data.title;


    /* =========================
   CONTENT
========================= */

if (data.load) {

    data.load();

} else {

    content.innerHTML = `
        <div class="content-card">
            ${data.content}
        </div>
    `;

}

    /* =========================
       URL
    ========================= */

    if (push) {

        history.pushState(
            {
                route: route
            },
            "",
            `adminpanel.html#${route}`
        );
    }
}


/* =========================
   NAVIGATION
========================= */

function navigate(route) {

    if (!routes[route]) {
        route = "dashboard";
    }

    loadRoute(route, true);
}


/* =========================
   MENU EVENTS
========================= */

function bindMenuEvents() {

    document
        .querySelectorAll(".menu-item")
        .forEach(menu => {

            menu.addEventListener(
                "click",
                () => {

                    const route =
                        menu.dataset.route;

                    navigate(route);

                }
            );

        });
}


/* =========================
   BACK / FORWARD
========================= */

window.addEventListener(
    "popstate",
    () => {

        const route =
            getCurrentRoute();

        loadRoute(
            route,
            false
        );

    }
);


/* =========================
   INITIALIZE
========================= */

export function initAdminRouter() {

    bindMenuEvents();

    const route =
        getCurrentRoute();

    loadRoute(
        route,
        false
    );
}
