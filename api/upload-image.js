/* =========================
   IMAGE UPLOAD  (P0 / Phase 2)

   POST /api/upload-image
   Authorization: Bearer <firebase-id-token>
   Content-Type: application/json
   { "kind": "avatar" | "cover", "imageBase64": "<base64 or data URI>" }

   -> 200 { id, url }

   WHY THIS EXISTS
   ---------------
   `users/{uid}` documents currently carry the avatar and cover as base64
   data URIs (measured: up to 204,147 B avatar + 231,775 B cover). Every
   read of that document transfers ~380 KB, which is what blows the
   Firestore egress quota. This endpoint moves the bytes out of Firestore
   and into Vercel Blob, and hands back only a short id.

   It does NOT write to Firestore. Phase 3 is what stores `avatarUrl` /
   `coverImageUrl` on the user document. Keeping that split means this
   endpoint can be deployed and tested with zero risk to existing data.

   WHY JSON + BASE64 AND NOT multipart/form-data
   ---------------------------------------------
   Vercel's Node runtime parses a JSON body for you (`req.body`), which
   keeps this file dependency-free. Multipart would require reading and
   parsing the raw request stream by hand. The repo already uses base64
   JSON for images (`api/uploadCertificate.js`), so this matches the
   existing contract rather than inventing a second one.

   THE 4.5 MB CEILING (this is why the limits below are not round numbers)
   ----------------------------------------------------------------------
   Vercel Functions cap the request body at 4.5 MB and answer 413
   `FUNCTION_PAYLOAD_TOO_LARGE` above it - before this code ever runs.
   Base64 inflates by 4/3, so a 3 MiB image arrives as a 4 MiB string and
   fits; a 4 MiB image would arrive as 5.33 MB and be rejected by the
   platform. The per-kind limits are therefore 2 MiB / 3 MiB, which still
   leaves 30-100x headroom over the measured real sizes (30,915 B avatar,
   112,591 B cover).

   WHY THIS FILE NEVER TOUCHES THE TOKEN IN THE RESPONSE
   -----------------------------------------------------
   The id is minted here, server-side, and the client is never allowed to
   choose it. Any value that reaches `put()` must match the same opaque
   pattern the read proxy enforces, so an upload can never write outside
   the "img/" prefix and a client can never point the store at a path of
   its own choosing.
========================= */

/* Initialise firebase-admin through the project's single source of truth
   for credentials, then use the default app. Imported for its side effect
   only - it is what makes `admin.auth()` usable below. */
import "./firebaseAdmin.js";

import admin from "firebase-admin";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const BLOB_PREFIX = "img/";

/* Mirrors the read proxy's pattern exactly. Anything minted here must be
   servable by api/img/[id].js, and vice versa. */
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

const MIB = 1024 * 1024;

/* Measured real payloads after the client-side compressImage() run are
   30,915 B (avatar) and 112,591 B (cover). These caps are guard rails
   against a malicious or buggy client, not a target size. */
const KIND_LIMITS = {
  avatar: 2 * MIB,
  cover: 3 * MIB
};

/* Accepted uploads, decided by the bytes themselves - never by the
   Content-Type the caller claims. The read proxy serves exactly this set,
   so anything else would be a blob nobody can fetch. */
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);

/**
 * Identify an image by its magic bytes.
 * @param {Buffer} buf
 * @returns {string|null} MIME type, or null when the bytes are not an image.
 */
function sniffImageType(buf) {

  if (
    buf.length >= 3
    && buf[0] === 0xFF
    && buf[1] === 0xD8
    && buf[2] === 0xFF
  ) {
    return "image/jpeg";
  }

  if (
    buf.length >= 8
    && buf[0] === 0x89
    && buf[1] === 0x50
    && buf[2] === 0x4E
    && buf[3] === 0x47
    && buf[4] === 0x0D
    && buf[5] === 0x0A
    && buf[6] === 0x1A
    && buf[7] === 0x0A
  ) {
    return "image/png";
  }

  if (
    buf.length >= 6
    && buf[0] === 0x47
    && buf[1] === 0x49
    && buf[2] === 0x46
    && buf[3] === 0x38
    && (buf[4] === 0x37 || buf[4] === 0x39)
    && buf[5] === 0x61
  ) {
    return "image/gif";
  }

  if (
    buf.length >= 12
    && buf.toString("ascii", 0, 4) === "RIFF"
    && buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    buf.length >= 12
    && buf.toString("ascii", 4, 8) === "ftyp"
  ) {

    const brand = buf.toString("ascii", 8, 12);

    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }

  }

  return null;
}

/**
 * Pull the Firebase ID token out of an Authorization header.
 * @param {unknown} headerValue
 * @returns {string|null}
 */
function readBearerToken(headerValue) {

  if (typeof headerValue !== "string") {
    return null;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(headerValue.trim());

  return match ? match[1] : null;
}

/**
 * Strip an optional `data:image/png;base64,` prefix and reject anything
 * that is not a plausible base64 payload.
 * @param {unknown} raw
 * @returns {string|null}
 */
function normaliseBase64(raw) {

  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }

  const comma = raw.indexOf(",");

  const body = (
    raw.startsWith("data:")
    && comma !== -1
  )
    ? raw.slice(comma + 1)
    : raw;

  if (body.length === 0) {
    return null;
  }

  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(body)) {
    return null;
  }

  return body;
}

export default async function handler(req, res) {

  if (req.method !== "POST") {

    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {

    return res.status(503).json({
      error: "Image store not configured"
    });

  }

  /* ---- 1. Identity. Never trust a uid sent in the body. ------------- */

  const idToken = readBearerToken(
    req.headers ? req.headers.authorization : undefined
  );

  if (!idToken) {

    return res.status(401).json({
      error: "Unauthorized"
    });

  }

  let uid;

  try {

    const decoded = await admin.auth().verifyIdToken(idToken);

    uid = decoded && decoded.uid;

    if (!uid) {
      throw new Error("token has no uid");
    }

  } catch (err) {

    /* Log the message only - never the token. */
    console.error(
      "upload-image auth failed:",
      err && err.message
    );

    return res.status(401).json({
      error: "Unauthorized"
    });

  }

  /* ---- 2. Shape of the request. ------------------------------------ */

  const body = req.body;

  if (!body || typeof body !== "object") {

    return res.status(400).json({
      error: "Expected a JSON body"
    });

  }

  const kind = body.kind;

  if (
    kind !== "avatar"
    && kind !== "cover"
  ) {

    return res.status(400).json({
      error: "kind must be 'avatar' or 'cover'"
    });

  }

  const limit = KIND_LIMITS[kind];

  const base64 = normaliseBase64(body.imageBase64);

  if (!base64) {

    return res.status(400).json({
      error: "imageBase64 missing or not valid base64"
    });

  }

  /* Cheap pre-check before allocating the decoded buffer. A 4.5 MB body
     ceiling already applies upstream, so this only ever catches a body
     that was accepted at the edge but is still far too big to be an
     avatar. */
  const maxBase64Length = Math.ceil(limit / 3) * 4 + 16;

  if (base64.length > maxBase64Length) {

    return res.status(413).json({
      error: `Image too large for ${kind} (limit ${limit} bytes)`
    });

  }

  const buffer = Buffer.from(base64, "base64");

  if (buffer.length === 0) {

    return res.status(400).json({
      error: "imageBase64 decoded to an empty payload"
    });

  }

  if (buffer.length > limit) {

    return res.status(413).json({
      error: `Image too large for ${kind} (limit ${limit} bytes)`
    });

  }

  /* ---- 3. The bytes must actually be an image. --------------------- */

  const contentType = sniffImageType(buffer);

  if (!contentType || !ALLOWED_TYPES.has(contentType)) {

    return res.status(415).json({
      error: "Unsupported media type"
    });

  }

  /* ---- 4. Mint the id here; the client never chooses it. ----------- */

  const id = randomUUID().replace(/-/g, "");

  if (!ID_PATTERN.test(id)) {

    /* Cannot happen with a UUID, but a mismatch here would produce a blob
       the read proxy refuses to serve, so fail loudly rather than write
       an unreadable object. */
    console.error("upload-image minted an id the proxy would reject");

    return res.status(500).json({
      error: "Server error"
    });

  }

  /* ---- 5. Store it. ------------------------------------------------ */

  try {

    await put(BLOB_PREFIX + id, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType
    });

  } catch (err) {

    console.error(
      "upload-image blob put failed:",
      err && err.message
    );

    return res.status(502).json({
      error: "Storage error"
    });

  }

  /* The URL points at the same-origin proxy, never at the blob host.
     That is what keeps the canvas un-tainted for NFT minting, and it means
     the public blob hostname can change without touching any client. */
  return res.status(200).json({
    id,
    url: "/api/img/" + id,
    size: buffer.length,
    contentType
  });

}
