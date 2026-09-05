/* =========================
   HACKCHEM ADMIN
   NOTIFICATIONS MODULE
========================= */

import {
    createNotification
} from "../notifications/notificationService.js";


/* =========================
   RENDER NOTIFICATION PAGE
========================= */

export function loadNotifications() {

    const content =
        document.getElementById(
            "adminContent"
        );

    if (!content) {
        console.error(
            "Notifications: adminContent not found."
        );

        return;
    }


    content.innerHTML = `

        <div class="content-card">

            <h2>Create Notification</h2>

            <p>
                Send a notification to HackChem users.
            </p>

            <div
                style="
                    margin-top: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    max-width: 700px;
                "
            >

                <input
                    id="notificationTitle"
                    type="text"
                    placeholder="Notification title"
                    style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 14px;
                    "
                >

                <input
                    id="notificationPreview"
                    type="text"
                    placeholder="Preview (optional)"
                    style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 14px;
                    "
                >

                <textarea
                    id="notificationContent"
                    rows="6"
                    placeholder="Notification content"
                    style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 14px;
                        resize: vertical;
                    "
                ></textarea>

                <button
                    id="sendNotificationBtn"
                    type="button"
                    style="
                        width: fit-content;
                        padding: 12px 18px;
                        border: none;
                        border-radius: 8px;
                        background: #111827;
                        color: white;
                        font-size: 14px;
                        cursor: pointer;
                    "
                >
                    Send Notification
                </button>

                <div
                    id="notificationStatus"
                    style="
                        min-height: 20px;
                        font-size: 14px;
                    "
                ></div>

            </div>

        </div>
    `;


    bindNotificationPage();

}


/* =========================
   BIND NOTIFICATION EVENTS
========================= */

function bindNotificationPage() {

    const button =
        document.getElementById(
            "sendNotificationBtn"
        );

    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async () => {

            const titleInput =
                document.getElementById(
                    "notificationTitle"
                );

            const previewInput =
                document.getElementById(
                    "notificationPreview"
                );

            const contentInput =
                document.getElementById(
                    "notificationContent"
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
