/* =========================
   HACKCHEM
   NOTIFICATION SERVICE
========================= */

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    db
} from "../../firebase.js";


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
    content

}) {

    if (!title || !content) {

        throw new Error(
            "Notification title and content are required."
        );

    }


    const notification = {

        title:
            title.trim(),

        preview:
            preview?.trim() ||
            content.trim(),

        content:
            content.trim(),

        createdAt:
            Timestamp.now()

    };


    const docRef =
        await addDoc(
            notificationsRef,
            notification
        );


    return {

        notificationId:
            docRef.id,

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
