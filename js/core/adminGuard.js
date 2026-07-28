import {
    getCurrentUID,
    getCurrentUser
} from "./auth.js";

import {
    isAdmin
} from "./permissions.js";

/**
 * Kiểm tra quyền truy cập Admin Panel.
 *
 * @returns {Promise<Object>} User object nếu là Admin
 */
export async function ensureAdmin() {

    // Chưa đăng nhập
    const uid = getCurrentUID();

    if (!uid) {
        window.location.href = "index.html";
        return;
    }

    // Đọc user (1 Read duy nhất)
    const user = await getCurrentUser();

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    // Không phải Admin
    if (!isAdmin(user)) {
        window.location.href = "home.html";
        return;
    }

    // Thành công
    return user;
}
