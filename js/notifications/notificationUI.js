/* =========================
   HACKCHEM
   NOTIFICATION UI
========================= */

import {
    subscribeEvent,
    EVENTS
} from "../realtime/hcEvents.js";

import {
    getNotificationById,
    getNotificationsAfter
} from "./notificationService.js";

/* =========================
   NOTIFICATION ICON LIBRARY
========================= */

const NOTIFICATION_ICON_LIBRARY = {
    default: "/assets/notifications/default.png",
    exam: "/assets/notifications/exam.png",
    lesson: "/assets/notifications/lesson.png",
    reward: "/assets/notifications/reward.png",
    warning: "/assets/notifications/warning.png"
};


function getNotificationImage(notification) {

    const imageId =
        notification?.imageId || "default";

    return (
        NOTIFICATION_ICON_LIBRARY[imageId] ||
        NOTIFICATION_ICON_LIBRARY.default
    );

}
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

    display:flex;
    gap:12px;

    padding:12px 16px;

    border-bottom:1px solid #f1f5f9;

    cursor:pointer;
}

.notification-item-image{
    width:52px;
    height:52px;

    flex-shrink:0;

    border-radius:10px;

    overflow:hidden;

    background:#f1f5f9;

    display:flex;
    align-items:center;
    justify-content:center;
}

.notification-item-image img{
    width:100%;
    height:100%;

    object-fit:cover;

    display:block;
}

.notification-item-image-placeholder{
    font-size:22px;
    opacity:0.55;
}

.notification-item-body{
    min-width:0;
    flex:1;
}

.notification-item-title{
    font-size:14px;
    font-weight:600;

    padding-right:14px;

    line-height:1.4;
}

.notification-item-preview{
    margin-top:5px;

    font-size:13px;
    line-height:1.4;

    color:#6b7280;

    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;

    overflow:hidden;
}

.notification-item-date{
    margin-top:5px;

    font-size:11px;

    color:#9ca3af;
}

.notification-item:hover{
    background:#f8fafc;
}

.notification-item.unread{
    background:#eff6ff;
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

const NOTIFICATION_STORAGE_KEY =
    "hackchem_notifications";

const MAX_STORED_NOTIFICATIONS = 10;

let unreadNotificationCount = 0;

let notifications = [];

let showAllNotifications = false;

let isNotificationSyncing = false;

/* =========================
   NOTIFICATION STORAGE
========================= */

function serializeNotification(notification) {
    return {
        ...notification,
        createdAt:
            notification.createdAt?.toDate &&
            typeof notification.createdAt.toDate === "function"
                ? notification.createdAt.toDate().toISOString()
                : notification.createdAt instanceof Date
                    ? notification.createdAt.toISOString()
                    : notification.createdAt
    };
}


function saveNotificationState() {
    try {
        const storedNotifications =
            notifications
                .slice(0, MAX_STORED_NOTIFICATIONS)
                .map(serializeNotification);

        localStorage.setItem(
            NOTIFICATION_STORAGE_KEY,
            JSON.stringify(storedNotifications)
        );

    } catch (error) {
        console.error(
            "Notification state save failed:",
            error
        );
    }
}


function loadNotificationState() {
    try {
        const storedData =
            localStorage.getItem(
                NOTIFICATION_STORAGE_KEY
            );

        if (!storedData) {
            return;
        }

        const parsedData =
            JSON.parse(storedData);

        if (!Array.isArray(parsedData)) {
            return;
        }

        notifications =
            parsedData
                .filter(
                    notification =>
                        notification &&
                        notification.notificationId
                )
                .slice(
                    0,
                    MAX_STORED_NOTIFICATIONS
                );

        unreadNotificationCount =
            notifications.filter(
                notification =>
                    notification.read !== true
            ).length;

    } catch (error) {
        console.error(
            "Notification state load failed:",
            error
        );

        notifications = [];

        unreadNotificationCount = 0;
    }
}

/* =========================
   NOTIFICATION SYNC
========================= */

function getNotificationTimestamp(createdAt) {
    if (!createdAt) {
        return 0;
    }

    if (
        createdAt?.toDate &&
        typeof createdAt.toDate === "function"
    ) {
        return createdAt.toDate().getTime();
    }

    if (
        createdAt instanceof Date
    ) {
        return createdAt.getTime();
    }

    const date =
        new Date(createdAt);

    const timestamp =
        date.getTime();

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}


async function syncNotifications() {

    if (isNotificationSyncing) {
        return;
    }

    isNotificationSyncing = true;

    try {

        /* =========================
           GET LATEST LOCAL TIMESTAMP
        ========================= */

        const latestLocalNotification =
            notifications.length > 0
                ? notifications[0]
                : null;

        const latestNotifications =
            await getNotificationsAfter(

                latestLocalNotification
                    ? latestLocalNotification.createdAt
                    : null,

                MAX_STORED_NOTIFICATIONS

            );


        /* =========================
           REMOVE DUPLICATES
        ========================= */

        const existingIds =
            new Set(
                notifications.map(
                    notification =>
                        notification.notificationId
                )
            );


        const missedNotifications =
            latestNotifications
                .filter(
                    notification =>
                        !existingIds.has(
                            notification.notificationId
                        )
                )
                .map(
                    notification => ({

                        ...notification,

                        read: false

                    })
                );


        /* =========================
           NO NEW NOTIFICATIONS
        ========================= */

        if (
            missedNotifications.length === 0
        ) {

            unreadNotificationCount =
                notifications.filter(
                    notification =>
                        notification.read !== true
                ).length;

            updateNotificationBell();

            renderNotificationList();

            console.log(
                "HackChem Notifications Synced: 0"
            );

            return;

        }


        /* =========================
           MERGE
        ========================= */

        notifications = [

            ...notifications,

            ...missedNotifications

        ];


        /* =========================
           SORT NEWEST FIRST
        ========================= */

        notifications.sort(

            (a, b) =>

                getNotificationTimestamp(
                    b.createdAt
                ) -

                getNotificationTimestamp(
                    a.createdAt
                )

        );


        /* =========================
           KEEP ONLY 10
        ========================= */

        notifications =
            notifications.slice(

                0,

                MAX_STORED_NOTIFICATIONS

            );


        /* =========================
           RECALCULATE UNREAD
        ========================= */

        unreadNotificationCount =
            notifications.filter(
                notification =>
                    notification.read !== true
            ).length;


        /* =========================
           SAVE LOCAL STATE
        ========================= */

        saveNotificationState();


        /* =========================
           UPDATE UI
        ========================= */

        updateNotificationBell();

        renderNotificationList();


        console.log(
            "HackChem Notifications Synced:",
            missedNotifications.length
        );


    } catch (error) {

        console.error(
            "Notification sync failed:",
            error
        );

    } finally {

        isNotificationSyncing = false;

    }

}
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
   RESTORE NOTIFICATION LIST VIEW
========================= */

function restoreNotificationListView() {

    const dropdown =
        document.getElementById(
            "notificationDropdown"
        );

    if (!dropdown) {
        return;
    }

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
        renderNotificationList();
   
/* =========================
   REFRESH NOTIFICATIONS
========================= */

const refreshBtn =
    document.getElementById(
        "notificationRefreshBtn"
    );

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        async event => {

            event.stopPropagation();

            await syncNotifications();
        }
    );
}
   
      /* =========================
       MARK ALL NOTIFICATIONS AS READ
    ========================= */

    const markAllBtn =
        document.getElementById(
            "markAllNotificationsReadBtn"
        );

    if (markAllBtn) {

        markAllBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                const hadUnreadNotifications =
    notifications.some(
        notification =>
            notification.read !== true
    );

notifications.forEach(
    notification => {
        notification.read = true;
    }
);

unreadNotificationCount = 0;

if (hadUnreadNotifications) {
    saveNotificationState();
}

updateNotificationBell();

renderNotificationList();

            }
        );

    }


    /* =========================
       LOAD MORE NOTIFICATIONS
    ========================= */

    const loadMoreBtn =
        document.getElementById(
            "loadMoreNotificationsBtn"
        );

    if (loadMoreBtn) {

        if (
            notifications.length <= 4 ||
            showAllNotifications
        ) {

            loadMoreBtn.style.display =
                "none";

        } else {

            loadMoreBtn.style.display =
                "block";

        }

        loadMoreBtn.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                showAllNotifications = true;

                renderNotificationList();

                loadMoreBtn.style.display =
                    "none";

            }
        );

    }

}

/* =========================
   FORMAT NOTIFICATION DATE
========================= */

function formatNotificationDate(createdAt) {

    if (!createdAt) {
        return "";
    }

    let date;

    if (
        createdAt?.toDate &&
        typeof createdAt.toDate === "function"
    ) {

        date = createdAt.toDate();

    } else if (
        createdAt instanceof Date
    ) {

        date = createdAt;

    } else {

        date = new Date(createdAt);

    }

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

/* =========================
   RENDER NOTIFICATION LIST
========================= */

function renderNotificationList() {

    const list =
        document.getElementById(
            "notificationList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = "";

    if (notifications.length === 0) {

        list.innerHTML = `
            <div
                style="
                    padding:30px 16px;
                    text-align:center;
                    color:#6b7280;
                    font-size:13px;
                "
            >
                Không có thông báo
            </div>
        `;

        return;
    }

   const visibleNotifications =
    showAllNotifications
        ? notifications
        : notifications.slice(0, 4);

visibleNotifications.forEach(
    notification => {

            const item =
                document.createElement(
                    "div"
                );

            const isUnread =
    notification.read !== true;

item.className =
    isUnread
        ? "notification-item unread"
        : "notification-item";

item.innerHTML = `

    ${
        isUnread
            ? `
                <span
                    class="notification-unread-dot"
                ></span>
            `
            : ""
    }

    <div class="notification-item-image">

        <img
            src="${getNotificationImage(notification)}"
            alt=""
        >

    </div>

    <div class="notification-item-body">

        <div
            class="notification-item-title"
            data-notification-title
        ></div>

        <div
            class="notification-item-preview"
            data-notification-preview
        ></div>

        <div
            class="notification-item-date"
            data-notification-date
        ></div>

    </div>

`;

const titleElement =
    item.querySelector(
        "[data-notification-title]"
    );

const previewElement =
    item.querySelector(
        "[data-notification-preview]"
    );

const dateElement =
    item.querySelector(
        "[data-notification-date]"
    );

if (titleElement) {
    titleElement.textContent =
        notification.title || "";
}

if (previewElement) {
    previewElement.textContent =
        notification.preview || "";
}

if (dateElement) {
    dateElement.textContent =
        formatNotificationDate(
            notification.createdAt
        );
}
           
item.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        /* =========================
           MARK NOTIFICATION AS READ
        ========================= */

        if (notification.read !== true) {

            notification.read = true;

            unreadNotificationCount--;

            if (unreadNotificationCount < 0) {
                unreadNotificationCount = 0;
            }
            saveNotificationState();
            updateNotificationBell();
        }

        openNotificationDetail(
            notification
        );

    }
);
            list.appendChild(item);
        }
    );
}

/* =========================
   OPEN NOTIFICATION DETAIL
========================= */

function openNotificationDetail(notification) {

    const dropdown =
        document.getElementById(
            "notificationDropdown"
        );

    if (!dropdown) {
        return;
    }

    dropdown.innerHTML = `

       <div
    class="notification-dropdown-header"
    style="
        justify-content:flex-start;
    "
>

    <button
        id="notificationBackBtn"
        type="button"
        title="Quay lại"
        style="
            border:none;
            background:transparent;
            cursor:pointer;
            font-size:18px;
            padding:4px 8px;
            margin-right:6px;
        "
    >
        ←
    </button>

    <strong>
        Notification
    </strong>

</div>

        <div
    style="
        padding:18px 16px;
        overflow-y:auto;
        max-height:420px;
    "
>

    <!-- =========================
         NOTIFICATION HEADER
    ========================== -->

    <div
        style="
            display:flex;
            align-items:center;
            gap:14px;
            margin-bottom:20px;
        "
    >

        <div
            style="
                width:64px;
                height:64px;
                flex-shrink:0;
                border-radius:12px;
                background:#f1f5f9;
                display:flex;
                align-items:center;
                justify-content:center;
                overflow:hidden;
            "
        >
            <img
                src="${getNotificationImage(notification)}"
                alt=""
                style="
                    width:50px;
                    height:50px;
                    object-fit:contain;
                    display:block;
                "
            >
        </div>


        <div
            style="
                min-width:0;
                flex:1;
            "
        >

            <div
    data-notification-detail-title
    style="
        font-size:16px;
        font-weight:700;
        line-height:1.4;
        color:#111827;
        margin-bottom:5px;
    "
></div>


<div
    data-notification-detail-preview
    style="
        font-size:13px;
        line-height:1.4;
        color:#6b7280;
        margin-bottom:5px;
    "
></div>

            <div
                style="
                    font-size:12px;
                    color:#9ca3af;
                "
            >
                ${formatNotificationDate(
                    notification.createdAt
                )}
            </div>

        </div>

    </div>


    <!-- =========================
         NOTIFICATION CONTENT
    ========================== -->

   <div
    data-notification-detail-content
    style="
        padding-top:4px;
        font-size:14px;
        line-height:1.7;
        color:#1f2937;
        white-space:pre-wrap;
        word-break:break-word;
    "
></div>
</div>
`;
   const detailTitle =
    detail.querySelector(
        "[data-notification-detail-title]"
    );

const detailPreview =
    detail.querySelector(
        "[data-notification-detail-preview]"
    );

const detailContent =
    detail.querySelector(
        "[data-notification-detail-content]"
    );

if (detailTitle) {
    detailTitle.textContent =
        notification.title || "";
}

if (detailPreview) {
    detailPreview.textContent =
        notification.preview || "";
}

if (detailContent) {
    detailContent.textContent =
        notification.content || "";
}
    const backBtn =
        document.getElementById(
            "notificationBackBtn"
        );

    if (backBtn) {

      backBtn.addEventListener(
    "click",
    event => {

        event.stopPropagation();

       restoreNotificationListView();

    }
);

    }
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

    if (isOpen) {

        dropdown.style.display =
            "none";

        return;
    }

    /* 
 * Always return to the first 4 notifications
 * whenever the bell is opened.
 */
   showAllNotifications = false;
    restoreNotificationListView();

    dropdown =
        document.getElementById(
            "notificationDropdown"
        );

    if (dropdown) {

        dropdown.style.display =
            "block";

    }

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

    container.appendChild(
    dropdown
);
restoreNotificationListView();
}


/* =========================
   CLOSE DROPDOWN ON OUTSIDE CLICK
========================= */

/* =========================
   CLOSE DROPDOWN ON OUTSIDE CLICK
========================= */

function bindNotificationOutsideClick() {

    document.addEventListener(
        "click",
        event => {

            const container =
                document.getElementById(
                    "notificationUI"
                );

            const dropdown =
                document.getElementById(
                    "notificationDropdown"
                );

            const bell =
                document.getElementById(
                    "notificationBell"
                );

            if (!container || !dropdown) {
                return;
            }

            if (
                dropdown.contains(
                    event.target
                ) ||
                bell?.contains(
                    event.target
                )
            ) {
                return;
            }

            dropdown.style.display =
                "none";

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

/* =========================
   ADD NOTIFICATION
========================= */
const alreadyExists =
    notifications.some(
        item =>
            item.notificationId ===
            notification.notificationId
    );

if (alreadyExists) {
    return;
}
notification.read = false;

notifications.unshift(
    notification
);

if (
    notifications.length >
    MAX_STORED_NOTIFICATIONS
) {
    notifications =
        notifications.slice(
            0,
            MAX_STORED_NOTIFICATIONS
        );
}

saveNotificationState();

/* =========================
   UPDATE BELL
========================= */

unreadNotificationCount =
    notifications.filter(
        notification =>
            notification.read !== true
    ).length;

updateNotificationBell();

/* =========================
   UPDATE DROPDOWN
========================= */

renderNotificationList();

        } catch (error) {

            console.error(
                "Notification receive failed:",
                error
            );

        }

    }
);

/* =========================
   AUTO SYNC — 20:00 DAILY
========================= */

let notificationAutoSyncTimer = null;

function scheduleNotificationAutoSync() {

    if (notificationAutoSyncTimer) {
        clearTimeout(
            notificationAutoSyncTimer
        );
    }

    const now = new Date();

    const nextSync = new Date(now);

    nextSync.setHours(
        8,
        53,
        0,
        0
    );

    /*
     * Nếu hiện tại đã qua 20:00
     * thì chuyển sang 20:00 ngày mai.
     */
    if (now >= nextSync) {

        nextSync.setDate(
            nextSync.getDate() + 1
        );

    }

    const delay =
        nextSync.getTime() -
        now.getTime();

    notificationAutoSyncTimer =
        setTimeout(
            async () => {

                await syncNotifications();

                /*
                 * Sau khi sync xong,
                 * lên lịch cho 20:00 ngày tiếp theo.
                 */
                scheduleNotificationAutoSync();

            },
            delay
        );

    console.log(
        "HackChem Notification Auto Sync scheduled:",
        nextSync
    );

}

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
         loadNotificationState();
         updateNotificationBell();
         bindNotificationOutsideClick();
         scheduleNotificationAutoSync();
    }
);
