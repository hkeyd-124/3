/* =========================
   SIWE VERIFY  (Phase 1)

   POST /api/siwe/verify
   Content-Type: application/json
   { "message": "<EIP-4361 text>", "signature": "0x..." }

   -> 200 { token, uid }
   -> 4xx/5xx { error: "<CODE>" }

   WHY THIS EXISTS
   ---------------
   Users who sign in with a wallet get no Firebase Auth session, so
   `hcHasFirebaseSession()` blocks the avatar/cover upload in js/profile.js.
   This endpoint turns proof-of-wallet-ownership into a Firebase custom
   token, which the client exchanges for a real session via
   signInWithCustomToken().

   WHAT IT DELIBERATELY DOES NOT DO
   --------------------------------
   * It never creates a uid. `wallet_index/{address}` already maps an
     address to the app's own `uid_<uuid>` (userService.js:73,
     index.html:713); that value is reused verbatim.
   * It never writes to `users`, `wallet_index` or `email_index`.
   * It never updates an Auth record. `createCustomToken()` only SIGNS a
     JWT - verified in this sandbox: calling it for a uid with no Auth
     record returns a token, and `getUser()` afterwards still returns
     auth/user-not-found. The Auth record is created later, by the client's
     own signInWithCustomToken() call.

   WHY createCustomToken() IS SAFE FOR uids THAT HAVE NO AUTH RECORD
   -----------------------------------------------------------------
   Measured against the real project (hack-chem-v1):
     getUser("uid_36036284...")      -> auth/user-not-found
     createCustomToken(same uid)     -> 200, JWT claim.uid matches exactly
     getUser after createCustomToken -> still auth/user-not-found
   So 8 of 9 real users, who have never had an Auth record, are covered.

   EIP-55 IS MANDATORY IN THE MESSAGE
   ----------------------------------
   `siwe` 3.0.0 rejects a lowercase address in the message text with
   "invalid EIP-55 address - 0x...". The client must call getAddress()
   before building the message (`js/siwe.js` does). Here the address is
   lowercased only AFTER verification, to match the `wallet_index` key.

   WHY THE DOMAIN CHECK RUNS BEFORE THE SIGNATURE CHECK
   ---------------------------------------------------
   `SiweMessage.verify()` is told `domain: siweMsg.domain`, i.e. the domain
   FROM the message. That makes DOMAIN_MISMATCH structurally impossible, so
   the allowlist below is the ONLY thing standing between an attacker and a
   message signed for a domain they control. It therefore must run first:
   it is cheap, and it avoids paying for an ECDSA recovery on garbage.

   WHY THE NONCE IS DELETED BEFORE THE TOKEN IS MINTED
   --------------------------------------------------
   Fail-closed. Every attempt that reaches this point consumes the nonce,
   so a stolen signature cannot be retried even if a later step fails.
   A failed attempt is recoverable by simply requesting a new nonce.
========================= */

import { db } from "../firebaseAdmin.js";

import admin from "firebase-admin";
import siwePkg from "siwe";

const { SiweMessage, SiweErrorType } = siwePkg;

/* Domain duoc phep ky.

   Production + moi preview *.vercel.app: neu chi cho production thi khong
   the test SIWE tren preview deployment, va do la noi PR duoc review
   truoc khi merge. Preview domain van la tai san cua project (Vercel cap
   theo team), khong phai domain cua ke tan cong.

   Them domain rieng vao day khi co (vd "hackchem.vn"). */
const PRODUCTION_HOSTS = new Set([
  "3-sand-eight.vercel.app"
]);

const VERCEL_PREVIEW_PATTERN = /^[a-z0-9-]+\.vercel\.app$/;

function isAllowedDomain(domain) {

  if (typeof domain !== "string" || !domain) return false;

  const host = domain.toLowerCase();

  if (PRODUCTION_HOSTS.has(host)) return true;

  return VERCEL_PREVIEW_PATTERN.test(host);

}

/* `siwe` reports failures as `error.type` = the human-readable message
   (e.g. "Signature does not match address of the message."), NOT the enum
   key. Map it back to a stable code so the client never parses prose. */
function errorCode(verifyResult) {

  const type = verifyResult && verifyResult.error && verifyResult.error.type;

  if (typeof type !== "string") return "INVALID_SIGNATURE";

  const key = Object.keys(SiweErrorType).find(
    (name) => SiweErrorType[name] === type
  );

  return key || "INVALID_SIGNATURE";

}

export default async function handler(req, res) {

  if (req.method !== "POST") {

    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "METHOD_NOT_ALLOWED"
    });

  }

  const body = req.body;

  if (!body || typeof body !== "object") {

    return res.status(400).json({
      error: "BAD_BODY"
    });

  }

  const { message, signature } = body;

  if (typeof message !== "string" || typeof signature !== "string") {

    return res.status(400).json({
      error: "MISSING_MESSAGE_OR_SIGNATURE"
    });

  }

  /* ---- 1. Parse. A malformed message throws here. ------------------ */

  let siweMsg;

  try {

    siweMsg = new SiweMessage(message);

  } catch (err) {

    console.error("siwe parse failed:", err && err.message);

    return res.status(400).json({
      error: "UNABLE_TO_PARSE"
    });

  }

  /* ---- 2. Domain allowlist, before paying for signature recovery. --- */

  if (!isAllowedDomain(siweMsg.domain)) {

    /* Log the domain (not a secret) so preview debugging is possible. */
    console.error("siwe domain not allowed:", siweMsg.domain);

    return res.status(401).json({
      error: "DOMAIN_NOT_ALLOWED"
    });

  }

  /* ---- 3. Verify signature + nonce + validity window. -------------- */

  let result;

  try {

    result = await siweMsg.verify(

      {
        signature,
        domain: siweMsg.domain,
        nonce: siweMsg.nonce,
        time: new Date().toISOString()
      },

      /* suppressExceptions: return { success:false, error } instead of
         throwing, so every failure travels one code path. */
      { suppressExceptions: true }

    );

  } catch (err) {

    console.error("siwe verify threw:", err && err.message);

    return res.status(401).json({
      error: "INVALID_SIGNATURE"
    });

  }

  if (!result || !result.success) {

    return res.status(401).json({
      error: errorCode(result)
    });

  }

  /* ---- 4. Nonce must exist, must belong to THIS address, then burn. - */

  const address = siweMsg.address.toLowerCase();

  const nonceRef = db.collection("siwe_nonces").doc(siweMsg.nonce);

  let nonceData;

  try {

    const nonceSnap = await nonceRef.get();

    if (!nonceSnap.exists) {

      return res.status(401).json({
        error: "NONCE_UNKNOWN"
      });

    }

    nonceData = nonceSnap.data();

  } catch (err) {

    console.error("siwe nonce read failed:", err && err.message);

    return res.status(500).json({
      error: "Server error"
    });

  }

  if (!nonceData || nonceData.address !== address) {

    return res.status(401).json({
      error: "NONCE_ADDRESS_MISMATCH"
    });

  }

  /* Server-side clock check. The Firestore TTL policy is only garbage
     collection; /api/siwe/nonce may not have it enabled at all, so the
     expiry must be enforced here or a nonce would live forever. */
  const expiresAt = nonceData.expiresAt;

  const expiresMs = expiresAt && typeof expiresAt.toMillis === "function"
    ? expiresAt.toMillis()
    : Date.parse(expiresAt);

  if (!Number.isFinite(expiresMs) || Date.now() > expiresMs) {

    return res.status(401).json({
      error: "NONCE_EXPIRED"
    });

  }

  /* Delete BEFORE minting: fail-closed, one attempt per nonce. */
  try {

    await nonceRef.delete();

  } catch (err) {

    console.error("siwe nonce delete failed:", err && err.message);

    return res.status(500).json({
      error: "Server error"
    });

  }

  /* ---- 5. address -> uid. NEVER create a uid here. ------------------ */

  let uid;

  try {

    const walletSnap = await db
      .collection("wallet_index")
      .doc(address)
      .get();

    const value = walletSnap.exists
      ? walletSnap.data() && walletSnap.data().uid
      : null;

    if (typeof value !== "string" || !value) {

      return res.status(404).json({
        error: "WALLET_NOT_REGISTERED"
      });

    }

    uid = value;

  } catch (err) {

    console.error("siwe wallet lookup failed:", err && err.message);

    return res.status(500).json({
      error: "Server error"
    });

  }

  /* ---- 6. Custom token carrying the EXISTING uid. ------------------- */

  try {

    const token = await admin.auth().createCustomToken(uid);

    /* Return uid so the client can compare it with localStorage.uid
       before signing in - a mismatch means the wallet was re-bound to a
       different account and signing in would write to the wrong doc. */
    return res.status(200).json({ token, uid });

  } catch (err) {

    /* Log message only - never the token. */
    console.error("siwe createCustomToken failed:", err && err.message);

    return res.status(500).json({
      error: "Server error"
    });

  }

}
