import {
    createNotification
} from "./js/notifications/notificationService.js";
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
    content: `

        <h2>Create Notification</h2>

        <p>
            Send a notification to HackChem users.
        </p>

        <input
            id="notificationTitleInput"
            type="text"
            placeholder="Notification title"
            style="
                width:100%;
                padding:14px;
                border-radius:14px;
                border:1px solid #ddd;
                margin-bottom:16px;
                box-sizing:border-box;
            "
        >

        <input
            id="notificationPreviewInput"
            type="text"
            placeholder="Preview (optional)"
            style="
                width:100%;
                padding:14px;
                border-radius:14px;
                border:1px solid #ddd;
                margin-bottom:16px;
                box-sizing:border-box;
            "
        >

        <textarea
            id="notificationContentInput"
            placeholder="Notification content"
            style="
                width:100%;
                min-height:140px;
                padding:14px;
                border-radius:14px;
                border:1px solid #ddd;
                margin-bottom:16px;
                box-sizing:border-box;
                resize:vertical;
            "
        ></textarea>

        <button
            id="sendNotificationButton"
            type="button"
            style="
                padding:14px 20px;
                border:none;
                border-radius:12px;
                cursor:pointer;
            "
        >
            Send Notification
        </button>

        <div
            id="notificationStatus"
            style="
                margin-top:14px;
                min-height:20px;
            "
        ></div>

    `
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

    content.innerHTML = `
        <div class="content-card">
            ${data.content}
        </div>
    `;
if (route === "notifications") {

    bindNotificationPage();

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
   NOTIFICATION PAGE
========================= */

function bindNotificationPage() {

    const button =
        document.getElementById(
            "sendNotificationButton"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async () => {

            const titleInput =
                document.getElementById(
                    "notificationTitleInput"
                );

            const previewInput =
                document.getElementById(
                    "notificationPreviewInput"
                );

            const contentInput =
                document.getElementById(
                    "notificationContentInput"
                );

            const status =
                document.getElementById(
                    "notificationStatus"
                );

            const title =
                titleInput?.value.trim();

            const preview =
                previewInput?.value.trim();

            const content =
                contentInput?.value.trim();

            if (!title || !content) {

                if (status) {
                    status.textContent =
                        "Title and content are required.";
                }

                return;
            }

            button.disabled = true;

            if (status) {
                status.textContent =
                    "Sending...";
            }

            try {

                const notification =
                    await createNotification({

                        title,

                        preview,

                        content

                    });

                console.log(
                    "HackChem Notification Created:",
                    notification
                );

                if (status) {
                    status.textContent =
                        "Notification sent successfully.";
                }

                titleInput.value = "";
                previewInput.value = "";
                contentInput.value = "";

            } catch (error) {

                console.error(
                    "Notification creation failed:",
                    error
                );

                if (status) {
                    status.textContent =
                        "Failed to send notification.";
                }

            } finally {

                button.disabled = false;

            }

        }
    );

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
