import {
    db,
    doc,
    getDoc
} from "../../firebase.js";

/**
 * Trả về UID hiện tại
 * @returns {string|null}
 */
export function getCurrentUID() {
    return localStorage.getItem("uid");
}

/**
 * Đọc thông tin user hiện tại
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {

    const uid = getCurrentUID();

    if (!uid) {
        return null;
    }

    const snapshot = await getDoc(
        doc(db, "users", uid)
    );

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data();
}
