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

        bindNotificationBell();

        updateNotificationBell();

    }
);
