// hcEvents.js

import {
    supabase
} from "./hcRealtime.js";


/* =========================
   HACKCHEM EVENTS
========================= */

export const EVENTS = {

    NOTIFICATION_CREATED:
        "notification.created"

};


/* =========================
   CHANNEL
========================= */

const EVENT_CHANNEL =
    "hackchem-events";


/* =========================
   SUBSCRIBE
========================= */

/**
 * Subscribe tới một HackChem event.
 *
 * @param {string} eventName
 * @param {Function} callback
 * @returns {Object} Supabase channel
 */
export function subscribeEvent(
    eventName,
    callback
) {

    const channel =
        supabase.channel(
            EVENT_CHANNEL
        );


    channel
        .on(
            "broadcast",
            {
                event: eventName
            },
            payload => {

                console.log(
                    "HackChem Event Received:",
                    eventName,
                    payload
                );

                callback(
                    payload.payload
                );

            }
        )
        .subscribe(
            status => {

                console.log(
                    "HackChem Event Channel:",
                    status
                );

            }
        );


    return channel;
}


/* =========================
   PUBLISH
========================= */

/**
 * Publish một HackChem event.
 *
 * @param {string} eventName
 * @param {Object} payload
 */
export async function publishEvent(
    eventName,
    payload = {}
) {

    const channel =
        supabase.channel(
            EVENT_CHANNEL
        );


    try {

        await new Promise(
            (resolve, reject) => {

                let finished = false;


                channel.subscribe(
                    async status => {

                        if (finished) {
                            return;
                        }


                        if (
                            status === "SUBSCRIBED"
                        ) {

                            try {

                                const result =
                                    await channel.send({

                                        type: "broadcast",

                                        event: eventName,

                                        payload

                                    });


                                if (
                                    result !== "ok"
                                ) {

                                    throw new Error(
                                        `Event publish failed: ${result}`
                                    );

                                }


                                console.log(
                                    "HackChem Event Published:",
                                    eventName,
                                    payload
                                );


                                finished = true;

                                resolve();

                            } catch (error) {

                                finished = true;

                                reject(error);

                            }

                        }


                        if (
                            status === "CHANNEL_ERROR" ||
                            status === "TIMED_OUT"
                        ) {

                            finished = true;

                            reject(
                                new Error(
                                    `Event channel failed: ${status}`
                                )
                            );

                        }

                    }
                );

            }
        );

    } finally {

        /*
         * IMPORTANT:
         * Remove temporary publish channel
         * after publish completes/fails.
         */

        await supabase.removeChannel(
            channel
        );

    }

}
