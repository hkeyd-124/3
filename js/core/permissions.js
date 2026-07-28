/**
 * Có phải Admin không?
 */
export function isAdmin(user) {

    return user?.system?.role === "admin";

}

/**
 * Có phải User thường không?
 */
export function isUser(user) {

    return user?.system?.role === "user";

}
