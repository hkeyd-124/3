/* =========================
   HACKCHEM ADMIN
   NOTIFICATIONS MODULE
========================= */
import {
    createNotification,
    getLatestNotifications,
    deleteNotification
} from "../notifications/notificationService.js";

/* =========================
   NOTIFICATION ICON LIBRARY
========================= */

const NOTIFICATION_ICONS = {
    default: {
        id: "default",
        name: "Thông báo",
        src: "/assets/notifications/default.png"
    },

    exam: {
        id: "exam",
        name: "Kiểm tra",
        src: "/assets/notifications/exam.png"
    },

    lesson: {
        id: "lesson",
        name: "Bài học",
        src: "/assets/notifications/lesson.png"
    },

    reward: {
        id: "reward",
        name: "Phần thưởng",
        src: "/assets/notifications/reward.png"
    },

    warning: {
        id: "warning",
        name: "Cảnh báo",
        src: "/assets/notifications/warning.png"
    }
};


/* =========================
   NOTIFICATION STATE
========================= */

let selectedNotificationIcon =
    NOTIFICATION_ICONS.default;


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


    selectedNotificationIcon =
        NOTIFICATION_ICONS.default;


    content.innerHTML = `

        <div class="content-card">

            <div
                style="
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                    gap: 24px;
                    padding: 22px;
                    border: 1px solid #d1d5db;
                    border-radius: 12px;
                    background: #ffffff;
                "
            >

                <!-- =========================
                     CREATE NOTIFICATION
                ========================== -->

                <div>

                    <h2
                        style="
                            margin: 0 0 20px;
                            font-size: 24px;
                            color: #111827;
                        "
                    >
                        Đăng thông báo mới
                    </h2>


                    <!-- ICON -->

                    <div
                        style="
                            display: flex;
                            align-items: center;
                            gap: 20px;
                        "
                    >

                        <button
                            id="notificationIconBtn"
                            type="button"
                            title="Chọn biểu tượng"
                            style="
                                width: 92px;
                                height: 92px;
                                padding: 10px;
                                border: 1px solid #d1d5db;
                                border-radius: 12px;
                                background: #ffffff;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            "
                        >
                            <img
                                id="notificationSelectedIcon"
                                src="${selectedNotificationIcon.src}"
                                alt="${selectedNotificationIcon.name}"
                                style="
                                    width: 64px;
                                    height: 64px;
                                    object-fit: contain;
                                "
                            >
                        </button>


                        <div
                            style="
                                flex: 1;
                                display: flex;
                                flex-direction: column;
                                gap: 14px;
                            "
                        >

                            <input
                                id="notificationTitle"
                                type="text"
                                placeholder="Tiêu đề"
                                style="
                                    width: 100%;
                                    box-sizing: border-box;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 14px;
                                "
                            >


                            <input
                                id="notificationPreview"
                                type="text"
                                placeholder="Tóm tắt"
                                style="
                                    width: 100%;
                                    box-sizing: border-box;
                                    padding: 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    font-size: 14px;
                                "
                            >

                        </div>

                    </div>


                    <!-- CONTENT -->

                    <textarea
                        id="notificationContent"
                        rows="7"
                        placeholder="Nội dung"
                        style="
                            width: 100%;
                            box-sizing: border-box;
                            margin-top: 14px;
                            padding: 12px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            font-size: 14px;
                            resize: vertical;
                        "
                    ></textarea>


                    <!-- ICON LIBRARY -->

                    <div
                        id="notificationIconLibrary"
                        style="
                            display: none;
                            margin-top: 12px;
                            padding: 14px;
                            border: 1px solid #d1d5db;
                            border-radius: 10px;
                            background: #f9fafb;
                        "
                    >

                        <div
                            style="
                                margin-bottom: 10px;
                                font-size: 14px;
                                font-weight: 600;
                                color: #111827;
                            "
                        >
                            Chọn biểu tượng
                        </div>

                        <div
                            id="notificationIconOptions"
                            style="
                                display: flex;
                                flex-wrap: wrap;
                                gap: 12px;
                            "
                        ></div>

                    </div>

                </div>


                <!-- =========================
                     PREVIEW
                ========================== -->

                <div
                    style="
                        border-left: 1px solid #d1d5db;
                        padding-left: 24px;
                        display: flex;
                        flex-direction: column;
                    "
                >

                    <h2
                        style="
                            margin: 0 0 20px;
                            font-size: 24px;
                            color: #111827;
                        "
                    >
                        Xem trước
                    </h2>


                    <div
                        style="
                            flex: 1;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 20px 0;
                        "
                    >

                        <div
                            style="
                                width: 100%;
                                max-width: 520px;
                                display: flex;
                                align-items: center;
                                gap: 16px;
                                padding: 16px;
                                box-sizing: border-box;
                                border-radius: 12px;
                                background: #f8fafc;
                            "
                        >

                            <div
                                style="
                                    width: 80px;
                                    height: 80px;
                                    flex-shrink: 0;
                                    border-radius: 14px;
                                    background: #eef2f7;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                "
                            >
                                <img
                                    id="notificationPreviewIcon"
                                    src="${selectedNotificationIcon.src}"
                                    alt=""
                                    style="
                                        width: 58px;
                                        height: 58px;
                                        object-fit: contain;
                                    "
                                >
                            </div>


                            <div
                                style="
                                    min-width: 0;
                                    flex: 1;
                                "
                            >

                                <div
                                    id="notificationPreviewTitle"
                                    style="
                                        font-size: 17px;
                                        font-weight: 700;
                                        color: #111827;
                                        overflow: hidden;
                                        text-overflow: ellipsis;
                                        white-space: nowrap;
                                    "
                                >
                                    Tiêu đề thông báo
                                </div>


                                <div
                                    id="notificationPreviewText"
                                    style="
                                        margin-top: 6px;
                                        font-size: 14px;
                                        color: #6b7280;
                                        overflow: hidden;
                                        text-overflow: ellipsis;
                                        white-space: nowrap;
                                    "
                                >
                                    Tóm tắt thông báo
                                </div>


                                <div
                                    id="notificationPreviewDate"
                                    style="
                                        margin-top: 6px;
                                        font-size: 12px;
                                        color: #9ca3af;
                                    "
                                ></div>

                            </div>

                        </div>

                    </div>


                    <!-- PUBLISH -->

                    <div
                        style="
                            display: flex;
                            justify-content: flex-end;
                            margin-top: auto;
                        "
                    >

                        <button
                            id="sendNotificationBtn"
                            type="button"
                            style="
                                padding: 10px 18px;
                                border: none;
                                border-radius: 8px;
                                background: #111827;
                                color: white;
                                font-size: 15px;
                                font-weight: 600;
                                cursor: pointer;
                            "
                        >
                            Xuất bản ➤
                        </button>

                    </div>


                    <div
                        id="notificationStatus"
                        style="
                            min-height: 20px;
                            margin-top: 10px;
                            font-size: 14px;
                            text-align: right;
                        "
                    ></div>

                                </div>

            </div>

            <!-- =========================
                 NOTIFICATION MANAGEMENT
            ========================== -->

            <div
                style="
                    margin-top: 24px;
                    padding: 22px;
                    border: 1px solid #d1d5db;
                    border-radius: 12px;
                    background: #ffffff;
                "
            >

                <h2
                    style="
                        margin: 0 0 18px;
                        font-size: 22px;
                        color: #111827;
                    "
                >
                    Quản lý thông báo
                </h2>

                <div
                    id="adminNotificationList"
                >
                    Đang tải thông báo...
                </div>

            </div>

        </div>
    `;


   renderNotificationIconLibrary();
   bindNotificationPage();
   bindNotificationPreview();
   loadNotificationManagement();

}

/* =========================
   NOTIFICATION MANAGEMENT
========================= */

async function loadNotificationManagement() {

    const list =
        document.getElementById(
            "adminNotificationList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = `
        <div style="
            padding:24px;
            text-align:center;
            color:#6b7280;
        ">
            Đang tải thông báo...
        </div>
    `;

    try {

        const notifications =
            await getLatestNotifications(50);

        if (!notifications.length) {

            list.innerHTML = `
                <div style="
                    padding:30px;
                    text-align:center;
                    color:#6b7280;
                ">
                    Chưa có thông báo nào.
                </div>
            `;

            return;
        }


         list.style.display = "grid";

         list.style.gridTemplateColumns =
             "repeat(auto-fit, minmax(280px, 1fr))";
         list.style.gap = "14px";
         list.innerHTML =
            notifications
                .map(notification => {

                    const icon =
                        NOTIFICATION_ICONS[
                            notification.imageId
                        ] ||
                        NOTIFICATION_ICONS.default;

                    const date =
                        formatNotificationDate(
                            notification.createdAt
                        );

                    return `
                        <div
                            data-notification-id="${notification.notificationId}"
                            style="
                                display:flex;
                                align-items:center;
                                gap:16px;
                                padding:14px;
                                border:1px solid #e5e7eb;
                                border-radius:12px;
                                background:#ffffff;
                            "
                        >

                            <div style="
                                width:58px;
                                height:58px;
                                flex-shrink:0;
                                border-radius:10px;
                                background:#f3f4f6;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                            ">
                                <img
                                    src="${icon.src}"
                                    alt="${icon.name}"
                                    style="
                                        width:44px;
                                        height:44px;
                                        object-fit:contain;
                                    "
                                >
                            </div>

                            <div style="
                                flex:1;
                                min-width:0;
                            ">

                                <div style="
                                    font-size:15px;
                                    font-weight:700;
                                    color:#111827;
                                ">
                                    ${notification.title || ""}
                                </div>

                                <div style="
                                    margin-top:4px;
                                    font-size:13px;
                                    color:#6b7280;
                                    overflow:hidden;
                                    text-overflow:ellipsis;
                                    white-space:nowrap;
                                ">
                                    ${notification.preview || ""}
                                </div>

                                <div style="
                                    margin-top:4px;
                                    font-size:12px;
                                    color:#9ca3af;
                                ">
                                    ${date}
                                </div>

                            </div>

                            <button
                                type="button"
                                class="admin-delete-notification"
                                data-notification-id="${notification.notificationId}"
                                style="
                                    padding:8px 14px;
                                    border:1px solid #fecaca;
                                    border-radius:8px;
                                    background:#fff;
                                    color:#dc2626;
                                    cursor:pointer;
                                    font-weight:600;
                                "
                            >
                                Xóa
                            </button>

                        </div>
                    `;
                })
                .join("");

        bindNotificationDeleteButtons();

    } catch (error) {

        console.error(
            "Notification management load failed:",
            error
        );

        list.innerHTML = `
            <div style="
                padding:24px;
                text-align:center;
                color:#dc2626;
            ">
                Không thể tải danh sách thông báo.
            </div>
        `;
    }
}

function formatNotificationDate(timestamp) {

    if (!timestamp) {
        return "";
    }

    const date =
        timestamp.toDate &&
        typeof timestamp.toDate === "function"
            ? timestamp.toDate()
            : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const hours =
        String(date.getHours()).padStart(2, "0");

    const minutes =
        String(date.getMinutes()).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const year =
        date.getFullYear();

    return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function bindNotificationDeleteButtons() {

    document
        .querySelectorAll(
            ".admin-delete-notification"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const notificationId =
                        button.dataset.notificationId;

                    if (!notificationId) {
                        return;
                    }

                    const confirmed =
                        confirm(
                            "Bạn có chắc muốn xóa thông báo này?"
                        );

                    if (!confirmed) {
                        return;
                    }

                    button.disabled = true;
                    button.textContent = "Đang xóa...";

                    try {

                        await deleteNotification(
                            notificationId
                        );

                        await loadNotificationManagement();

                    } catch (error) {

                        console.error(
                            "Notification deletion failed:",
                            error
                        );

                        alert(
                            "Không thể xóa thông báo."
                        );

                        button.disabled = false;
                        button.textContent = "Xóa";
                    }
                }
            );

        });
}
/* =========================
   ICON LIBRARY
========================= */

function renderNotificationIconLibrary() {

    const container =
        document.getElementById(
            "notificationIconOptions"
        );

    if (!container) {
        return;
    }


    container.innerHTML =
        Object.values(
            NOTIFICATION_ICONS
        )
            .map(
                icon => `
                    <button
                        type="button"
                        class="notification-icon-option"
                        data-icon-id="${icon.id}"
                        title="${icon.name}"
                        style="
                            width: 64px;
                            height: 64px;
                            padding: 8px;
                            border: 2px solid ${
                                icon.id === selectedNotificationIcon.id
                                    ? "#2563eb"
                                    : "#d1d5db"
                            };
                            border-radius: 10px;
                            background: #ffffff;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        "
                    >
                        <img
                            src="${icon.src}"
                            alt="${icon.name}"
                            style="
                                width: 44px;
                                height: 44px;
                                object-fit: contain;
                            "
                        >
                    </button>
                `
            )
            .join("");


    container
        .querySelectorAll(
            ".notification-icon-option"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const iconId =
                        button.dataset.iconId;

                    const icon =
                        NOTIFICATION_ICONS[
                            iconId
                        ];

                    if (!icon) {
                        return;
                    }


                    selectedNotificationIcon =
                        icon;


                    const selectedIcon =
                        document.getElementById(
                            "notificationSelectedIcon"
                        );

                    const previewIcon =
                        document.getElementById(
                            "notificationPreviewIcon"
                        );


                    if (selectedIcon) {
                        selectedIcon.src =
                            icon.src;

                        selectedIcon.alt =
                            icon.name;
                    }


                    if (previewIcon) {
                        previewIcon.src =
                            icon.src;
                    }


                    renderNotificationIconLibrary();

                }
            );

        });

}


/* =========================
   ICON BUTTON
========================= */

function bindNotificationIconButton() {

    const button =
        document.getElementById(
            "notificationIconBtn"
        );

    const library =
        document.getElementById(
            "notificationIconLibrary"
        );

    if (!button || !library) {
        return;
    }


    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            library.style.display =
                library.style.display === "none"
                    ? "block"
                    : "none";

        }
    );

}


/* =========================
   PREVIEW
========================= */

function bindNotificationPreview() {

    const titleInput =
        document.getElementById(
            "notificationTitle"
        );

    const previewInput =
        document.getElementById(
            "notificationPreview"
        );

    if (!titleInput || !previewInput) {
        return;
    }


    const updatePreview = () => {

        const previewTitle =
            document.getElementById(
                "notificationPreviewTitle"
            );

        const previewText =
            document.getElementById(
                "notificationPreviewText"
            );

        const previewDate =
            document.getElementById(
                "notificationPreviewDate"
            );


        if (previewTitle) {
            previewTitle.textContent =
                titleInput.value.trim() ||
                "Tiêu đề thông báo";
        }


        if (previewText) {
            previewText.textContent =
                previewInput.value.trim() ||
                "Tóm tắt thông báo";
        }


        if (previewDate) {
            previewDate.textContent =
                formatPreviewDate(
                    new Date()
                );
        }

    };


    titleInput.addEventListener(
        "input",
        updatePreview
    );

    previewInput.addEventListener(
        "input",
        updatePreview
    );


    updatePreview();

}


/* =========================
   PREVIEW DATE
========================= */

function formatPreviewDate(date) {

    const hours =
        String(
            date.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            date.getMinutes()
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const year =
        date.getFullYear();


    return `${hours}:${minutes} ${day}/${month}/${year}`;

}


/* =========================
   PUBLISH
========================= */

function bindNotificationPage() {

    bindNotificationIconButton();


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
                    "Publishing...";
            }


            try {

                const notification =
                    await createNotification({

                        title,

                        preview,

                        content,

                        imageId:
                            selectedNotificationIcon.id

                    });


                console.log(
                    "HackChem Notification Created:",
                    notification
                );


                if (status) {
                    status.textContent =
                        "Notification published successfully.";
                }


                titleInput.value = "";

                previewInput.value = "";

                contentInput.value = "";


                selectedNotificationIcon =
                    NOTIFICATION_ICONS.default;


                const selectedIcon =
                    document.getElementById(
                        "notificationSelectedIcon"
                    );

                const previewIcon =
                    document.getElementById(
                        "notificationPreviewIcon"
                    );


                if (selectedIcon) {
                    selectedIcon.src =
                        selectedNotificationIcon.src;

                    selectedIcon.alt =
                        selectedNotificationIcon.name;
                }


                if (previewIcon) {
                    previewIcon.src =
                        selectedNotificationIcon.src;
                }


                bindNotificationPreview();


                renderNotificationIconLibrary();

               await loadNotificationManagement();


            } catch (error) {

                console.error(
                    "Notification creation failed:",
                    error
                );


                if (status) {
                    status.textContent =
                        "Failed to publish notification.";
                }

            } finally {

                button.disabled = false;

            }

        }
    );

}
