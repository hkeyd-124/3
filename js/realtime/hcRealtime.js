// hcRealtime.js

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
} from "./config.js";


/* =========================
   SUPABASE CLIENT
========================= */

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


/* =========================
   CONNECTION
========================= */

/**
 * Kết nối tới HackChem Realtime.
 *
 * Phase 0B:
 * Chỉ kiểm tra khả năng kết nối.
 *
 * Không Firestore.
 * Không Notification.
 */
export function connectRealtime() {

    return new Promise((resolve, reject) => {

        const channel =
            supabase.channel(
                "hackchem-realtime-test"
            );


        channel.subscribe(
            (status) => {

                console.log(
                    "HackChem Realtime:",
                    status
                );


                if (
                    status === "SUBSCRIBED"
                ) {

                    resolve(channel);

                }


                if (
                    status === "CHANNEL_ERROR" ||
                    status === "TIMED_OUT"
                ) {

                    reject(
                        new Error(
                            `Realtime connection failed: ${status}`
                        )
                    );

                }

            }
        );

    });

}


/* =========================
   EXPORT
========================= */

export {
    supabase
};
