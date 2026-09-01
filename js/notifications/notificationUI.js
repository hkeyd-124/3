/* =========================
   HACKCHEM
   NOTIFICATION UI
========================= */

import {
    subscribeEvent,
    EVENTS
} from "../realtime/hcEvents.js";

import {
    getNotificationById
} from "./notificationService.js";

/* =========================
   NOTIFICATION UI STYLES
========================= */

const notificationStyle = document.createElement("style");

notificationStyle.textContent = `

#notificationUI{
    position:relative;
    display:flex;
    align-items:center;
}

#notificationBell{
    position:relative;
    width:34px;
    height:34px;
    padding:0;
    margin:0;
    border:none;
    background:transparent;
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
}

#notificationBellIcon{
    width:26px;
    height:26px;
    display:block;
    fill:#f5b400;
    stroke:#f5b400;
    stroke-width:1.5;
    overflow:visible;
}

#notificationBadge{
    position:absolute;
    top:-3px;
    right:-4px;

    min-width:19px;
    height:19px;

    padding:0 5px;
    border-radius:50px;

    background:#ff0000;
    color:white;

    font-size:12px;
    font-weight:700;

    display:none;
    align-items:center;
    justify-content:center;

    line-height:1;
}

#notificationBell.has-notification
#notificationBellIcon{
    animation:
        notificationBellShake
        0.8s
        ease-in-out
        infinite;
}

@keyframes notificationBellShake{

    0%{
        transform:rotate(0deg);
    }

    15%{
        transform:rotate(12deg);
    }

    30%{
        transform:rotate(-12deg);
    }

    45%{
        transform:rotate(9deg);
    }

    60%{
        transform:rotate(-9deg);
    }

    75%{
        transform:rotate(4deg);
    }

    90%{
        transform:rotate(-4deg);
    }

    100%{
        transform:rotate(0deg);
    }

}

/* =========================
   NOTIFICATION DROPDOWN
========================= */

#notificationDropdown{
    position:absolute;
    top:42px;
    right:0;

    width:380px;
    max-height:520px;

    background:white;
    border:1px solid #e5e7eb;
    border-radius:14px;

    box-shadow:
        0 12px 35px
        rgba(0,0,0,0.15);

    z-index:9999;

    overflow:hidden;
    display:none;
}

.notification-dropdown-header{
    display:flex;
    align-items:center;
    justify-content:space-between;

    padding:14px 16px;

    border-bottom:1px solid #e5e7eb;
}

.notification-dropdown-actions{
    display:flex;
    align-items:center;
    gap:8px;
}

.notification-dropdown-actions button{
    border:none;
    background:transparent;
    cursor:pointer;
}

#notificationRefreshBtn{
    width:30px;
    height:30px;

    border-radius:50%;

    font-size:18px;
}

#notificationRefreshBtn:hover{
    background:#f3f4f6;
}

#markAllNotificationsReadBtn{
    font-size:12px;
    color:#2563eb;
}

.notification-list{
    max-height:410px;
    overflow-y:auto;
}

.notification-item{
    position:relative;

    padding:14px 16px;

    border-bottom:1px solid #f1f5f9;

    cursor:pointer;
}

.notification-item:hover{
    background:#f8fafc;
}

.notification-item.unread{
    background:#eff6ff;
}

.notification-item-title{
    font-size:14px;
    font-weight:600;

    padding-right:14px;
}

.notification-item-preview{
    margin-top:5px;

    font-size:13px;
    line-height:1.4;

    color:#6b7280;
}

.notification-unread-dot{
    position:absolute;

    top:12px;
    right:12px;

    width:8px;
    height:8px;

    border-radius:50%;

    background:#2563eb;
}

.notification-load-more{
    width:100%;

    padding:12px;

    border:none;
    border-top:1px solid #e5e7eb;

    background:white;

    font-size:13px;
    font-weight:600;

    cursor:pointer;
}

.notification-load-more:hover{
    background:#f8fafc;
}

`;

document.head.appendChild(
    notificationStyle
);

/* =========================
   RENDER NOTIFICATION UI
========================= */

function renderNotificationUI(){

    const container =
        document.getElementById(
            "notificationUI"
        );

    if(!container){
        return;
    }

    container.innerHTML = `

        <button
            id="notificationBell"
            type="button"
            aria-label="Notifications"
        >

            <svg
                id="notificationBellIcon"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <path
                    d="
                        M18 8
                        A6 6 0 0 0 6 8
                        C6 13 4 14 4 16
                        H20
                        C20 14 18 13 18 8
                        Z
                    "
                ></path>

                <path
                    d="
                        M10 20
                        H14
                    "
                ></path>

            </svg>

            <span
                id="notificationBadge"
            >
                0
            </span>

        </button>

    `;

}

/* =========================
   STATE
========================= */

let unreadNotificationCount = 0;
let latestNotification = null;

/* =========================
   UPDATE BELL
========================= */

function updateNotificationBell() {

    const bell =
        document.getElementById(
            "notificationBell"
        );

    const badge =
        document.getElementById(
            "notificationBadge"
        );

    if (!bell || !badge) {
        return;
    }


    if (unreadNotificationCount > 0) {

        bell.classList.add(
            "has-notification"
        );

        badge.style.display =
            "flex";

        badge.textContent =
            unreadNotificationCount > 99
                ? "99+"
                : unreadNotificationCount;

    } else {

        bell.classList.remove(
            "has-notification"
        );

        badge.style.display =
            "none";

    }

}



/* =========================
   BIND NOTIFICATION BELL
========================= */

function bindNotificationBell() {

    const bell =
        document.getElementById(
            "notificationBell"
        );

    if (!bell) {
        return;
    }

    bell.addEventListener(
        "click",
        () => {

            toggleNotificationDropdown();

        }
    );

}

/* =========================
   NOTIFICATION DROPDOWN
========================= */

function toggleNotificationDropdown() {

    let dropdown =
        document.getElementById(
            "notificationDropdown"
        );

    if (!dropdown) {

        createNotificationDropdown();

        dropdown =
            document.getElementById(
                "notificationDropdown"
            );

    }

    if (!dropdown) {
        return;
    }

    const isOpen =
        dropdown.style.display === "block";

    dropdown.style.display =
        isOpen
            ? "none"
            : "block";

}


function createNotificationDropdown() {

    const container =
        document.getElementById(
            "notificationUI"
        );

    if (!container) {
        return;
    }

    const dropdown =
        document.createElement(
            "div"
        );

    dropdown.id =
        "notificationDropdown";

    dropdown.innerHTML = `

        <div class="notification-dropdown-header">

            <strong>
                Notifications
            </strong>

            <div class="notification-dropdown-actions">

                <button
                    id="notificationRefreshBtn"
                    type="button"
                    title="Refresh"
                >
                    ↻
                </button>

                <button
                    id="markAllNotificationsReadBtn"
                    type="button"
                >
                    Mark all as read
                </button>

            </div>

        </div>

        <div
            id="notificationList"
            class="notification-list"
        ></div>

        <button
            id="loadMoreNotificationsBtn"
            type="button"
            class="notification-load-more"
        >
            Xem thêm
        </button>

    `;

    container.appendChild(
        dropdown
    );

}


/* =========================
   NOTIFICATION REALTIME
========================= */

subscribeEvent(
    EVENTS.NOTIFICATION_CREATED,
    async payload => {

        try {

            const notificationId =
                payload?.notificationId;

            if (!notificationId) {
                return;
            }


            const notification =
                await getNotificationById(
                    notificationId
                );

            if (!notification) {
                return;
            }


            console.log(
                "HackChem Notification received:",
                notification
            );
            latestNotification =
            notification;

            /* =========================
               UPDATE BELL
            ========================= */

            unreadNotificationCount++;

            updateNotificationBell();

        } catch (error) {

            console.error(
                "Notification receive failed:",
                error
            );

        }

    }
);

/* =========================
   INITIALIZE
========================= */

window.addEventListener(
    "DOMContentLoaded",
    () => {

        /* =========================
           RENDER UI
        ========================= */

        renderNotificationUI();


        /* =========================
           BIND EVENTS
        ========================= */

        bindNotificationBell();


        /* =========================
           INITIAL STATE
        ========================= */

        updateNotificationBell();

    }
);
