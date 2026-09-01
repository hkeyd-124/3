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
   OPEN NOTIFICATION DETAIL
========================= */

function openNotificationDetail() {

    if (!latestNotification) {
        return;
    }


    let modal =
        document.getElementById(
            "notificationDetailModal"
        );


    /* =========================
       CREATE MODAL
       ========================= */

    if (!modal) {

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "notificationDetailModal";

        modal.innerHTML = `

            <div
                id="notificationDetailBackdrop"
                style="
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.45);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    z-index: 9999;
                "
            >

                <div
                    style="
                        width: min(520px, 100%);
                        background: white;
                        border-radius: 18px;
                        padding: 24px;
                        box-shadow: 0 20px 50px rgba(0,0,0,0.2);
                        position: relative;
                    "
                >

                    <button
                        id="notificationDetailClose"
                        type="button"
                        aria-label="Close"
                        style="
                            position: absolute;
                            top: 14px;
                            right: 14px;
                            width: 32px;
                            height: 32px;
                            border: none;
                            border-radius: 50%;
                            background: #f3f4f6;
                            cursor: pointer;
                            font-size: 18px;
                        "
                    >
                        ×
                    </button>

                    <div
                        style="
                            font-size: 13px;
                            color: #6b7280;
                            margin-bottom: 8px;
                        "
                    >
                        Notification
                    </div>

                    <h2
                        id="notificationDetailTitle"
                        style="
                            margin: 0 40px 12px 0;
                            font-size: 22px;
                            line-height: 1.3;
                        "
                    ></h2>

                    <div
                        id="notificationDetailPreview"
                        style="
                            font-size: 14px;
                            color: #6b7280;
                            margin-bottom: 18px;
                        "
                    ></div>

                    <div
                        id="notificationDetailContent"
                        style="
                            font-size: 15px;
                            line-height: 1.6;
                            color: #1f2937;
                            white-space: pre-wrap;
                        "
                    ></div>

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        /* =========================
           CLOSE BUTTON
        ========================= */

        document
            .getElementById(
                "notificationDetailClose"
            )
            .addEventListener(
                "click",
                closeNotificationDetail
            );


        /* =========================
           BACKDROP
        ========================= */

        document
            .getElementById(
                "notificationDetailBackdrop"
            )
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target.id ===
                        "notificationDetailBackdrop"
                    ) {

                        closeNotificationDetail();

                    }

                }
            );

    }


    /* =========================
       FILL DATA
    ========================= */

    document
        .getElementById(
            "notificationDetailTitle"
        )
        .textContent =
            latestNotification.title ||
            "";


    document
        .getElementById(
            "notificationDetailPreview"
        )
        .textContent =
            latestNotification.preview ||
            "";


    document
        .getElementById(
            "notificationDetailContent"
        )
        .textContent =
            latestNotification.content ||
            "";


    /* =========================
       SHOW
    ========================= */

    modal.style.display =
        "block";

}

/* =========================
   CLOSE NOTIFICATION DETAIL
========================= */

function closeNotificationDetail() {

    const modal =
        document.getElementById(
            "notificationDetailModal"
        );

    if (!modal) {
        return;
    }

    modal.remove();

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

            openNotificationDetail();

        }
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
