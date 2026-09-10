// users.js

import {
    db
} from "../../firebase.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   CONSTANTS
========================= */

const CACHE_PREFIX = "hackchem_admin_users_";

let usersCache = [];
let filteredUsers = [];

let currentFilters = {
    search: "",
    role: "all",
    status: "all"
};


/* =========================
   CACHE
========================= */

function getCacheKey() {
    const adminUID =
        localStorage.getItem("uid");
    return `${CACHE_PREFIX}${adminUID || "unknown"}`;
}


function loadLocalCache() {

    try {

        const raw =
            localStorage.getItem(
                getCacheKey()
            );

        if (!raw) {
            return null;
        }

        const data = JSON.parse(raw);

        if (!Array.isArray(data)) {
            return null;
        }

        return data;

    } catch (error) {

        console.error(
            "Users cache read failed:",
            error
        );

        return null;
    }
}


function saveLocalCache(users) {

    try {

        localStorage.setItem(
            getCacheKey(),
            JSON.stringify(users)
        );

    } catch (error) {

        console.error(
            "Users cache save failed:",
            error
        );
    }
}


/* =========================
   FIRESTORE
========================= */

async function fetchUsersFromFirestore() {

    const snapshot =
        await getDocs(
            collection(db, "users")
        );

    const users = [];

    snapshot.forEach(snapshotDoc => {

        const data = snapshotDoc.data();

        users.push({
            uid: data.uid || snapshotDoc.id,
            name: data.name || "",
            email: data.email || "",
            wallet: data.wallet || "",
            avatar: data.avatar || "",
            points: Number(data.points) || 0,
            streak: Number(data.streak) || 0,
            createdAt: data.createdAt || "",
            role: data.system?.role || "user",
            status: data.system?.status || "active"
        });

    });

    users.sort(
        (a, b) =>
            getCreatedTime(b) -
            getCreatedTime(a)
    );

    return users;
}


/* =========================
   DATE
========================= */

function getCreatedTime(user) {

    if (!user.createdAt) {
        return 0;
    }

    const time =
        new Date(user.createdAt).getTime();

    return Number.isNaN(time)
        ? 0
        : time;
}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


/* =========================
   DISPLAY
========================= */

function shortenWallet(wallet) {

    if (!wallet) {
        return "—";
    }

    if (wallet.length <= 16) {
        return wallet;
    }

    return (
        wallet.slice(0, 6) +
        "..." +
        wallet.slice(-6)
    );
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getInitial(user) {

    const name =
        user.name?.trim();

    if (name) {
        return name
            .charAt(0)
            .toUpperCase();
    }

    if (user.email) {
        return user.email
            .charAt(0)
            .toUpperCase();
    }

    return "?";
}


/* =========================
   FILTER
========================= */

function applyFilters() {

    const search =
        currentFilters.search
            .trim()
            .toLowerCase();

    filteredUsers =
        usersCache.filter(user => {

            if (
                currentFilters.role !== "all" &&
                user.role !== currentFilters.role
            ) {
                return false;
            }

            if (
                currentFilters.status !== "all" &&
                user.status !== currentFilters.status
            ) {
                return false;
            }

            if (!search) {
                return true;
            }

            return [
                user.name,
                user.email,
                user.wallet,
                user.uid
            ]
                .join(" ")
                .toLowerCase()
                .includes(search);

        });

    renderUserList();
}


/* =========================
   USER LIST
========================= */

function renderUserList() {

    const container =
        document.getElementById(
            "usersList"
        );

    const count =
        document.getElementById(
            "usersCount"
        );

    if (!container) {
        return;
    }

    if (count) {

        count.textContent =
            `${filteredUsers.length} user${
                filteredUsers.length === 1
                    ? ""
                    : "s"
            }`;
    }


    if (!filteredUsers.length) {

        container.innerHTML = `
            <div class="hc-users-empty">
                <div class="hc-users-empty-icon">
                    👥
                </div>

                <div class="hc-users-empty-title">
                    No users found
                </div>

                <div class="hc-users-empty-text">
                    Try changing your search or filters.
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML =
        filteredUsers
            .map(renderUserRow)
            .join("");

    bindUserActions();
}


function renderUserRow(user) {

    const isBanned =
        user.status === "banned";

    const statusText =
        isBanned
            ? "Banned"
            : "Active";

    const actionText =
        isBanned
            ? "Activate"
            : "Ban";

    const actionClass =
        isBanned
            ? "hc-user-action-activate"
            : "hc-user-action-ban";


    return `
        <div
            class="hc-user-row ${
                isBanned
                    ? "hc-user-row-banned"
                    : ""
            }"
            data-uid="${escapeHTML(user.uid)}"
        >

            <div class="hc-user-main">

                ${
                    user.avatar
                        ? `
                            <img
                                class="hc-user-avatar"
                                src="${escapeHTML(user.avatar)}"
                                alt=""
                            >
                        `
                        : `
                            <div class="hc-user-avatar hc-user-avatar-fallback">
                                ${escapeHTML(
                                    getInitial(user)
                                )}
                            </div>
                        `
                }

                <div class="hc-user-identity">

                    <div class="hc-user-name">
                        ${
                            escapeHTML(
                                user.name ||
                                "Unnamed User"
                            )
                        }
                    </div>

                    <div class="hc-user-uid">
                        ${escapeHTML(user.uid)}
                    </div>

                </div>

            </div>


            <div class="hc-user-field hc-user-email">
                <span class="hc-user-label">
                    Email
                </span>

                <span class="hc-user-value">
                    ${
                        escapeHTML(
                            user.email || "—"
                        )
                    }
                </span>
            </div>


            <div class="hc-user-field hc-user-wallet">

                <span class="hc-user-label">
                    Wallet
                </span>

                <span
                    class="hc-user-value"
                    title="${escapeHTML(
                        user.wallet || ""
                    )}"
                >
                    ${
                        escapeHTML(
                            shortenWallet(
                                user.wallet
                            )
                        )
                    }
                </span>

            </div>


            <div class="hc-user-stat">

                <span class="hc-user-label">
                    Points
                </span>

                <span class="hc-user-value">
                    ${user.points}
                </span>

            </div>


            <div class="hc-user-stat">

                <span class="hc-user-label">
                    Streak
                </span>

                <span class="hc-user-value">
                    ${user.streak}
                </span>

            </div>


            <div class="hc-user-field">

                <span class="hc-user-label">
                    Role
                </span>

                <span
                    class="
                        hc-user-role
                        ${
                            user.role === "admin"
                                ? "hc-user-role-admin"
                                : ""
                        }
                    "
                >
                    ${
                        user.role === "admin"
                            ? "Admin"
                            : "User"
                    }
                </span>

            </div>


            <div class="hc-user-field">

                <span class="hc-user-label">
                    Joined
                </span>

                <span class="hc-user-value">
                    ${
                        formatDate(
                            user.createdAt
                        )
                    }
                </span>

            </div>


            <div class="hc-user-status">

                <span
                    class="
                        hc-user-status-dot
                        ${
                            isBanned
                                ? "hc-user-status-dot-banned"
                                : ""
                        }
                    "
                ></span>

                <span>
                    ${statusText}
                </span>

            </div>


            <div class="hc-user-actions">

                <button
                    type="button"
                    class="hc-user-more"
                    data-user-action="${actionText.toLowerCase()}"
                    data-uid="${escapeHTML(user.uid)}"
                    title="${actionText}"
                >
                    ⋮
                </button>

            </div>

        </div>
    `;
}


/* =========================
   ACTIONS
========================= */

function bindUserActions() {

    const buttons =
        document.querySelectorAll(
            ".hc-user-more"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            async event => {

                event.stopPropagation();

                const uid =
                    button.dataset.uid;

                const action =
                    button.dataset.userAction;

                if (!uid) {
                    return;
                }

                if (action === "ban") {

                    await changeUserStatus(
                        uid,
                        "banned"
                    );

                    return;
                }

                if (action === "activate") {

                    await changeUserStatus(
                        uid,
                        "active"
                    );
                }

            }
        );

    });
}


async function changeUserStatus(
    uid,
    newStatus
) {

    const user =
        usersCache.find(
            item => item.uid === uid
        );

    if (!user) {
        return;
    }

    const action =
        newStatus === "banned"
            ? "ban"
            : "activate";

    const message =
        newStatus === "banned"
            ? `Ban user "${user.name || user.email || uid}"?`
            : `Activate user "${user.name || user.email || uid}"?`;

    if (!window.confirm(message)) {
        return;
    }


    try {

        await updateDoc(
            doc(db, "users", uid),
            {
                "system.status": newStatus
            }
        );


        user.status = newStatus;

        saveLocalCache(usersCache);

        applyFilters();

    } catch (error) {

        console.error(
            `Failed to ${action} user:`,
            error
        );

        alert(
            newStatus === "banned"
                ? "Ban user failed."
                : "Activate user failed."
        );
    }
}


/* =========================
   UI STATE
========================= */

function showLoading() {

    const container =
        document.getElementById(
            "usersList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="hc-users-loading">
            <div class="hc-users-spinner"></div>

            <span>
                Loading users...
            </span>
        </div>
    `;
}


function showError() {

    const container =
        document.getElementById(
            "usersList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="hc-users-empty">

            <div class="hc-users-empty-icon">
                ⚠️
            </div>

            <div class="hc-users-empty-title">
                Failed to load users
            </div>

            <div class="hc-users-empty-text">
                Please try Refresh again.
            </div>

        </div>
    `;
}


/* =========================
   REFRESH
========================= */

async function refreshUsers() {

    const button =
        document.getElementById(
            "usersRefreshBtn"
        );

    if (button) {
        button.disabled = true;
        button.classList.add(
            "hc-users-refreshing"
        );
    }

    showLoading();

    try {

        const users =
            await fetchUsersFromFirestore();

        usersCache = users;

        saveLocalCache(
            usersCache
        );

        applyFilters();

    } catch (error) {

        console.error(
            "Users refresh failed:",
            error
        );

        showError();

    } finally {

        if (button) {
            button.disabled = false;
            button.classList.remove(
                "hc-users-refreshing"
            );
        }

    }
}


/* =========================
   EVENTS
========================= */

function bindFilters() {

    const searchInput =
        document.getElementById(
            "usersSearch"
        );

    const roleFilter =
        document.getElementById(
            "usersRoleFilter"
        );

    const statusFilter =
        document.getElementById(
            "usersStatusFilter"
        );

    const refreshButton =
        document.getElementById(
            "usersRefreshBtn"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                currentFilters.search =
                    searchInput.value;

                applyFilters();

            }
        );

    }


    if (roleFilter) {

        roleFilter.addEventListener(
            "change",
            () => {

                currentFilters.role =
                    roleFilter.value;

                applyFilters();

            }
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            () => {

                currentFilters.status =
                    statusFilter.value;

                applyFilters();

            }
        );

    }


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            refreshUsers
        );

    }

}


/* =========================
   STYLE
========================= */

function injectStyles() {

    if (
        document.getElementById(
            "hc-users-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "hc-users-styles";

    style.textContent = `

        .hc-users-panel {
            width: 100%;
        }

        .hc-users-toolbar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
            flex-wrap: wrap;
        }

        .hc-users-search {
            flex: 1;
            min-width: 260px;
            padding: 11px 14px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            background: rgba(255,255,255,0.85);
            font-size: 14px;
            outline: none;
        }

        .hc-users-search:focus {
            border-color: #9ca3af;
            box-shadow: 0 0 0 3px rgba(17,24,39,0.05);
        }

        .hc-users-select {
            padding: 11px 12px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            background: rgba(255,255,255,0.85);
            font-size: 14px;
            cursor: pointer;
        }

        .hc-users-refresh {
            border: none;
            border-radius: 10px;
            padding: 11px 15px;
            background: #111827;
            color: white;
            font-size: 14px;
            cursor: pointer;
            transition: 0.2s;
            white-space: nowrap;
        }

        .hc-users-refresh:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        }

        .hc-users-refresh:disabled {
            opacity: 0.6;
            cursor: default;
            transform: none;
        }

        .hc-users-refreshing {
            pointer-events: none;
        }

        .hc-users-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            color: #6b7280;
            font-size: 13px;
        }

        .hc-users-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .hc-user-row {
            display: grid;
            grid-template-columns:
                minmax(190px, 1.5fr)
                minmax(180px, 1.35fr)
                minmax(150px, 1.1fr)
                65px
                65px
                80px
                95px
                85px
                42px;
            align-items: center;
            gap: 14px;

            padding: 12px 14px;

            background: rgba(255,255,255,0.78);
            border: 1px solid #e5e7eb;
            border-radius: 12px;

            box-shadow:
                0 4px 14px rgba(0,0,0,0.04);

            transition: 0.18s;
        }

        .hc-user-row:hover {
            transform: translateY(-1px);
            box-shadow:
                0 7px 20px rgba(0,0,0,0.07);
        }

        .hc-user-row-banned {
            opacity: 0.72;
        }

        .hc-user-main {
            display: flex;
            align-items: center;
            min-width: 0;
            gap: 10px;
        }

        .hc-user-avatar {
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            border-radius: 50%;
            object-fit: cover;
            background: #facc15;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            color: #111827;
        }

        .hc-user-identity {
            min-width: 0;
        }

        .hc-user-name {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .hc-user-uid {
            margin-top: 3px;
            font-size: 10px;
            color: #9ca3af;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .hc-user-field,
        .hc-user-stat,
        .hc-user-status {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .hc-user-label {
            font-size: 10px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .hc-user-value {
            font-size: 13px;
            color: #374151;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .hc-user-stat .hc-user-value {
            font-weight: 600;
            color: #111827;
        }

        .hc-user-role {
            display: inline-flex;
            width: fit-content;
            padding: 3px 8px;
            border-radius: 999px;
            background: #f3f4f6;
            color: #374151;
            font-size: 11px;
            font-weight: 600;
        }

        .hc-user-role-admin {
            background: #fef3c7;
            color: #92400e;
        }

        .hc-user-status {
            flex-direction: row;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #374151;
        }

        .hc-user-status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #22c55e;
            flex: 0 0 7px;
        }

        .hc-user-status-dot-banned {
            background: #ef4444;
        }

        .hc-user-actions {
            display: flex;
            justify-content: flex-end;
        }

        .hc-user-more {
            width: 32px;
            height: 32px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: rgba(255,255,255,0.85);
            color: #374151;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            transition: 0.15s;
        }

        .hc-user-more:hover {
            background: #f3f4f6;
        }

        .hc-users-empty {
            min-height: 220px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #6b7280;
        }

        .hc-users-empty-icon {
            font-size: 30px;
            margin-bottom: 10px;
        }

        .hc-users-empty-title {
            font-size: 15px;
            font-weight: 600;
            color: #374151;
        }

        .hc-users-empty-text {
            margin-top: 5px;
            font-size: 13px;
        }

        .hc-users-loading {
            min-height: 220px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: #6b7280;
            font-size: 13px;
        }

        .hc-users-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #e5e7eb;
            border-top-color: #111827;
            border-radius: 50%;
            animation: hcUsersSpin 0.8s linear infinite;
        }

        @keyframes hcUsersSpin {
            to {
                transform: rotate(360deg);
            }
        }

        @media (max-width: 1100px) {

            .hc-user-row {
                grid-template-columns:
                    minmax(180px, 1.5fr)
                    minmax(160px, 1.2fr)
                    minmax(130px, 1fr)
                    60px
                    60px
                    75px
                    85px
                    75px
                    38px;

                gap: 9px;
            }

        }

    `;

    document.head.appendChild(style);
}


/* =========================
   RENDER PANEL
========================= */

function renderPanel() {

    const content =
        document.getElementById(
            "adminContent"
        );

    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="content-card hc-users-panel">

            <h2>
                Users
            </h2>

            <p>
                Manage HackChem users and account status.
            </p>


            <div class="hc-users-toolbar">

                <input
                    id="usersSearch"
                    class="hc-users-search"
                    type="search"
                    placeholder="Search name, email, wallet or UID..."
                    autocomplete="off"
                >


                <select
                    id="usersRoleFilter"
                    class="hc-users-select"
                >
                    <option value="all">
                        All Roles
                    </option>

                    <option value="user">
                        User
                    </option>

                    <option value="admin">
                        Admin
                    </option>
                </select>


                <select
                    id="usersStatusFilter"
                    class="hc-users-select"
                >
                    <option value="all">
                        All Status
                    </option>

                    <option value="active">
                        Active
                    </option>

                    <option value="banned">
                        Banned
                    </option>
                </select>


                <button
                    id="usersRefreshBtn"
                    class="hc-users-refresh"
                    type="button"
                >
                    ↻ Refresh
                </button>

            </div>


            <div class="hc-users-meta">

                <span id="usersCount">
                    0 users
                </span>

            </div>


            <div
                id="usersList"
                class="hc-users-list"
            ></div>

        </div>
    `;
}


/* =========================
   INIT
========================= */

export async function loadUsers() {

    injectStyles();

    renderPanel();

    bindFilters();


    const cached =
        loadLocalCache();


    if (cached) {

        usersCache = cached;

        applyFilters();

        return;
    }


    showLoading();


    try {

        usersCache =
            await fetchUsersFromFirestore();

        saveLocalCache(
            usersCache
        );

        applyFilters();

    } catch (error) {

        console.error(
            "Initial users load failed:",
            error
        );

        showError();
    }
}
