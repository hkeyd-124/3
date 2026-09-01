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
