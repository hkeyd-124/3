/* =========================
   SIWE NONCE  (Phase 1)

   POST /api/siwe/nonce
   Content-Type: application/json
   { "address": "0x..." }

   -> 200 { nonce, address }
   -> 429 { error: "RATE_LIMITED" }   (Phase 6)

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

   RATE LIMITING (Phase 6)
   -----------------------
   Every POST writes one Firestore document, so an unauthenticated script
   could burn the project's write quota. A per-IP counter closes that.

   WHY A FIRESTORE COUNTER AND NOT AN IN-MEMORY ONE
   ------------------------------------------------
   Same reason the nonce lives in Firestore: Vercel Functions are stateless
   and horizontally scaled, so a module-level Map would be per-instance and
   would reset on every cold start - it would not limit anything.

   WHY IT FAILS OPEN
   -----------------
   This is abuse mitigation, not authentication. If the IP cannot be
   determined, or Firestore errors while counting, the request is allowed
   through. Blocking a real user because of an infrastructure hiccup would
   break the feature this endpoint exists to support, and the nonce itself
   is still protected by the signature check in /api/siwe/verify.
========================= */

import { db } from "../firebaseAdmin.js";

import siwePkg from "siwe";

import { getAddress } from "ethers";

import crypto from "node:crypto";

const { generateNonce } = siwePkg;

/* Nonce song 5 phut. Du de user mo vi va ky (co the cham), ngan de cua so
   replay nho. /api/siwe/verify kiem tra lai thoi gian nay, nen TTL policy
   tren Firestore chi la don rac - khong phai co che bao ve. */
const NONCE_TTL_MS = 5 * 60 * 1000;

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/* ---- Rate limit ---------------------------------------------------- */

/* 10 nonce / 10 phut / IP. Mot user that chi can 1 nonce cho moi lan doi
   avatar, nen 10 la rong rai; mot script spam thi bi chan sau vai giay. */
const RATE_LIMIT_MAX = 10;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/* Collection rieng, KHONG dung chung voi siwe_nonces: nonce la du lieu
   nghiep vu (verify doc no), con day chi la bo dem tam. */
const RATE_LIMIT_COLLECTION = "siwe_rate_limits";

/* Lay IP that. Vercel dat x-forwarded-for; phan tu DAU TIEN la client that,
   cac phan tu sau la proxy. Khong tin ca header tho. */
function getClientIp(req) {

  const headers = (req && req.headers) || {};

  const xff = headers["x-forwarded-for"];

  if (typeof xff === "string" && xff.length) {

    const first = xff.split(",")[0].trim();

    if (first) return first;

  }

  const real = headers["x-real-ip"];

  if (typeof real === "string" && real.trim()) return real.trim();

  return null;

}

/* Khong luu IP tho: hash de khong co du lieu ca nhan nam trong DB, va de
   document id co do dai co dinh. */
function rateLimitKey(ip) {

  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);

}

/* Tra { allowed, retryAfterSec }. Moi loi deu fail-open. */
async function checkRateLimit(ip) {

  if (!ip) return { allowed: true, retryAfterSec: 0 };

  try {

    const ref = db.collection(RATE_LIMIT_COLLECTION).doc(rateLimitKey(ip));

    const now = Date.now();

    /* Transaction de hai request dong thoi khong cung doc count=9 roi cung
       ghi count=10 (se lot 11 request). */
    return await db.runTransaction(async (tx) => {

      const snap = await tx.get(ref);

      const data = snap.exists ? snap.data() : null;

      const windowStart =
        data && data.windowStart && typeof data.windowStart.toMillis === "function"
          ? data.windowStart.toMillis()
          : 0;

      const count = data && typeof data.count === "number" ? data.count : 0;

      /* Cua so moi (chua co doc, hoac da qua 10 phut). */
      if (!windowStart || now - windowStart >= RATE_LIMIT_WINDOW_MS) {

        tx.set(ref, {
          count: 1,
          windowStart: new Date(now),
          /* expiresAt de bat TTL cho collection nay sau; khong bat cung
             khong sao vi cua so tu reset theo windowStart. */
          expiresAt: new Date(now + RATE_LIMIT_WINDOW_MS + 60 * 60 * 1000)
        });

        return { allowed: true, retryAfterSec: 0 };

      }

      if (count >= RATE_LIMIT_MAX) {

        return {
          allowed: false,
          retryAfterSec: Math.max(
            1,
            Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000)
          )
        };

      }

      tx.set(ref, {
        count: count + 1,
        windowStart: new Date(windowStart),
        expiresAt: new Date(windowStart + RATE_LIMIT_WINDOW_MS + 60 * 60 * 1000)
      });

      return { allowed: true, retryAfterSec: 0 };

    });

  } catch (err) {

    /* Log message only - never the IP or the hash. */
    console.error("siwe rate limit check failed (fail-open):", err && err.message);

    return { allowed: true, retryAfterSec: 0 };

  }

}

export default async function handler(req, res) {

  if (req.method !== "POST") {

    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  /* Rate limit TRUOC khi validate body: request rac cung ton mot write neu
     no di tiep, nen phai dem ca request sai dinh dang. */
  const rate = await checkRateLimit(getClientIp(req));

  if (!rate.allowed) {

    res.setHeader("Retry-After", String(rate.retryAfterSec));

    return res.status(429).json({
      error: "RATE_LIMITED"
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

  /* Tra kem dia chi EIP-55 checksum.

     `siwe` 3.x tu choi dia chi chu thuong trong message bang loi
     "invalid EIP-55 address", va provider KHONG dam bao tra ve dang
     checksum: MetaMask tra chu thuong. Client vi vay khong the dung
     accounts[0] de dung message - no se bi /api/siwe/verify tu choi bang
     400 UNABLE_TO_PARSE. Server chuan hoa san o day va tra kem, de client
     chi viec dung dung gia tri nay. */
  let checksummed;

  try {

    checksummed = getAddress(address);

  } catch (err) {

    console.error("siwe checksum failed:", err && err.message);

    return res.status(400).json({
      error: "address must be a 0x-prefixed 40-hex-char string"
    });

  }

  return res.status(200).json({ nonce, address: checksummed });

}
