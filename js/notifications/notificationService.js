/* =========================
   HACKCHEM
   NOTIFICATION SERVICE
========================= */
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    db
} from "../../firebase.js";

import {
    publishEvent,
    EVENTS
} from "../realtime/hcEvents.js";


/* =========================
   COLLECTION
========================= */

const notificationsRef =
    collection(
        db,
        "notifications"
    );


/* =========================
   CREATE NOTIFICATION
========================= */

export async function createNotification({
    title,
    preview,
    content,
    imageId = "default"
}) {

    if (!title || !content) {

        throw new Error(
            "Notification title and content are required."
        );

    }


    const notification = {
    title: title.trim(),
    preview: preview?.trim() || content.trim(),
    content: content.trim(),
    imageId: imageId || "default",
    createdAt: Timestamp.now()
};


    /* =========================
       FIRESTORE WRITE
    ========================= */

    const docRef =
        await addDoc(
            notificationsRef,
            notification
        );


    const notificationId =
        docRef.id;


    /* =========================
       REALTIME EVENT
    ========================= */

    await publishEvent(

        EVENTS.NOTIFICATION_CREATED,

        {
            notificationId
        }

    );


    /* =========================
       RETURN
    ========================= */

    return {

        notificationId,

        ...notification

    };

}


/* =========================
   GET LATEST NOTIFICATIONS
========================= */

export async function getLatestNotifications(
    maxResults = 20
) {

    const notificationsQuery =
        query(

            notificationsRef,

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(
                maxResults
            )

        );


    const snapshot =
        await getDocs(
            notificationsQuery
        );


    return snapshot.docs.map(
        doc => ({

            notificationId:
                doc.id,

            ...doc.data()

        })
    );

}

/* =========================
   GET NOTIFICATIONS AFTER
========================= */

export async function getNotificationsAfter(
    createdAt,
    maxResults = 10
) {

    /* =========================
       INITIAL SYNC
    ========================= */

    if (!createdAt) {

        return getLatestNotifications(
            maxResults
        );

    }


    /* =========================
       NORMALIZE TIMESTAMP
    ========================= */

    let queryTimestamp;

    if (
        createdAt?.toDate &&
        typeof createdAt.toDate === "function"
    ) {

        queryTimestamp =
            createdAt;

    } else {

        const date =
            createdAt instanceof Date
                ? createdAt
                : new Date(createdAt);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return getLatestNotifications(
                maxResults
            );

        }

        queryTimestamp =
            Timestamp.fromDate(
                date
            );

    }


    /* =========================
       INCREMENTAL QUERY
    ========================= */

    const notificationsQuery =
        query(

            notificationsRef,

            where(
                "createdAt",
                ">",
                queryTimestamp
            ),

            orderBy(
                "createdAt",
                "desc"
            ),

            limit(
                maxResults
            )

        );


    const snapshot =
        await getDocs(
            notificationsQuery
        );


    return snapshot.docs.map(
        doc => ({

            notificationId:
                doc.id,

            ...doc.data()

        })
    );

}

/* =========================
   GET NOTIFICATION BY ID
========================= */

export async function getNotificationById(
    notificationId
) {

    if (!notificationId) {

        throw new Error(
            "notificationId is required."
        );

    }


    const notificationRef =
        doc(

            db,

            "notifications",

            notificationId

        );


    const snapshot =
        await getDoc(
            notificationRef
        );


    if (!snapshot.exists()) {

        return null;

    }


    return {

        notificationId:
            snapshot.id,

        ...snapshot.data()

    };

}
/* =========================
   DELETE NOTIFICATION
========================= */

export async function deleteNotification(
    notificationId
) {
    if (!notificationId) {
        throw new Error(
            "notificationId is required."
        );
    }

    const notificationRef =
        doc(
            db,
            "notifications",
            notificationId
        );

    await deleteDoc(
        notificationRef
    );

    return {
        notificationId
    };
}
