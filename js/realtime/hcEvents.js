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


    await new Promise(
        (resolve, reject) => {

            channel.subscribe(
                async status => {

                    if (
                        status === "SUBSCRIBED"
                    ) {

                        const result =
                            await channel.send({

                                type: "broadcast",

                                event: eventName,

                                payload

                            });


                        if (result !== "ok") {

                            reject(
                                new Error(
                                    `Event publish failed: ${result}`
                                )
                            );

                            return;
                        }


                        console.log(
                            "HackChem Event Published:",
                            eventName,
                            payload
                        );


                        resolve();

                    }


                    if (
                        status === "CHANNEL_ERROR" ||
                        status === "TIMED_OUT"
                    ) {

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

}
