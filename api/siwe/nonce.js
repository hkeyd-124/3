/* =========================
   SIWE NONCE  (Phase 1)

   POST /api/siwe/nonce
   Content-Type: application/json
   { "address": "0x..." }

   -> 200 { nonce }

   WHY THIS EXISTS
   ---------------
   Users who sign in with a wallet (index.html:777-778 writes only
   localStorage "wallet"/"uid") never get a Firebase Auth session, so
   `hcHasFirebaseSession()` in js/profile.js is false and the avatar/cover
   upload is blocked. SIWE gives them a real session by proving they hold
   the wallet's private key.

   A signature is only replay-proof if it commits to a value the server
   chose and will accept exactly once. That value is the nonce, and this
   endpoint is where it is minted.

   WHY THE NONCE IS STORED IN FIRESTORE AND NOT IN MEMORY
   -----------------------------------------------------
   Vercel Functions are stateless: each request may land on a different
   instance, so an in-process Map would lose the nonce between the nonce
   call and the verify call. Firestore is already a dependency of this
   project, so it is the cheapest durable store that needs no new service.

   The document id IS the nonce, which makes the one-time check a single
   point read in /api/siwe/verify and makes a duplicate nonce impossible
   (a second write to the same id would overwrite, never duplicate).

   WHY THE ADDRESS IS STORED LOWERCASE
   -----------------------------------
   `wallet_index` is keyed by the lowercase address at every writer
   (userService.js:73, index.html:713, js/authLink.js:63). Storing the
   nonce's address the same way means /api/siwe/verify can compare the two
   with a plain string equality instead of normalising twice.

   NOTE ON EIP-55
   --------------
   The address accepted here is NOT required to be EIP-55 checksummed,
   because this endpoint only records it. The checksum requirement lives in
   the SIWE message itself (see api/siwe/verify.js) - `siwe` rejects a
   lowercase address in the message with "invalid EIP-55 address".
========================= */

import { db } from "../firebaseAdmin.js";

import siwePkg from "siwe";

const { generateNonce } = siwePkg;

/* Nonce song 5 phut. Du de user mo vi va ky (co the cham), ngan de cua so
   replay nho. /api/siwe/verify kiem tra lai thoi gian nay, nen TTL policy
   tren Firestore chi la don rac - khong phai co che bao ve. */
const NONCE_TTL_MS = 5 * 60 * 1000;

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export default async function handler(req, res) {

  if (req.method !== "POST") {

    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  const body = req.body;

  if (!body || typeof body !== "object") {

    return res.status(400).json({
      error: "Expected a JSON body"
    });

  }

  const raw = body.address;

  if (typeof raw !== "string" || !ADDRESS_PATTERN.test(raw.trim())) {

    return res.status(400).json({
      error: "address must be a 0x-prefixed 40-hex-char string"
    });

  }

  const address = raw.trim().toLowerCase();

  const nonce = generateNonce();

  try {

    await db.collection("siwe_nonces").doc(nonce).set({

      address,

      createdAt: new Date().toISOString(),

      /* Field nay can TTL policy tren Firestore Console. Chua bat TTL thi
         doc het han chi nam lai vo hai: /api/siwe/verify tu kiem tra
         expiresAt, nen mot nonce cu khong the dung lai du con trong DB. */
      expiresAt: new Date(Date.now() + NONCE_TTL_MS)

    });

  } catch (err) {

    /* Log message only - never the address or the nonce. */
    console.error("siwe nonce write failed:", err && err.message);

    return res.status(500).json({
      error: "Server error"
    });

  }

  return res.status(200).json({ nonce });

}
