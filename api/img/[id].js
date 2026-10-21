/* =========================
   SAME-ORIGIN IMAGE PROXY  (P0 / Phase 1)

   GET /api/img/<id>

   WHY THIS EXISTS
   ---------------
   `users/{uid}` documents currently carry the avatar and cover as base64
   data URIs (measured: up to 204,147 B avatar + 231,775 B cover). Every
   read of that document therefore transfers ~380 KB, which is what blows
   the Firestore egress quota. Storing the bytes outside Firestore and
   keeping only a short URL in the document fixes that.

   WHY IT IS ROUTED BY ID AND NOT BY URL
   -------------------------------------
   Vercel's Fair Use Guidelines list "Proxies and VPNs" under *Never fair
   use*. An endpoint that accepts an arbitrary URL from the client
   (`/api/img?u=<url>`) is exactly that shape, and it is also an SSRF
   primitive. This route accepts only an opaque id that the server itself
   minted, and it only ever reads from this project's own Blob store. That
   matches "Functions that query DBs or APIs" in *Examples of fair use*.

   WHY SAME-ORIGIN MATTERS (do not "optimise" this away)
   -----------------------------------------------------
   js/certificateEngine.js draws the avatar onto #certificateCanvas and
   js/lessonEngine.js then calls canvas.toDataURL(). That file never sets
   crossOrigin, so a CROSS-ORIGIN image would taint the canvas and
   toDataURL() would throw "SecurityError: Tainted canvases may not be
   exported" - breaking NFT minting. Serving the bytes from this same
   origin means the canvas can never be tainted, so neither
   js/certificate*.js nor the same-origin guards in js/profile.js and
   js/users/users.js need to change.
========================= */

import { head, BlobNotFoundError } from "@vercel/blob";

/* Opaque id minted by the upload endpoint. Deliberately excludes "/", "\",
   "." and "%" so path traversal and prefix escapes are impossible by
   construction - the id is appended to a fixed "img/" prefix. */
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

const BLOB_PREFIX = "img/";

/* Only real image types are ever served. Anything else is refused rather
   than streamed, so this route cannot be used to host arbitrary files. */
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);

const ONE_YEAR = 31536000;

export default async function handler(req, res) {

  if (req.method !== "GET" && req.method !== "HEAD") {

    res.setHeader("Allow", "GET, HEAD");

    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  /* Vercel may hand back an array when a query key repeats. */
  const rawId = req.query ? req.query.id : undefined;

  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (typeof id !== "string" || !ID_PATTERN.test(id)) {

    return res.status(400).json({
      error: "Invalid image id"
    });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {

    return res.status(503).json({
      error: "Image store not configured"
    });
  }

  try {

    const meta = await head(BLOB_PREFIX + id);

    if (!meta || !meta.url) {

      return res.status(404).json({
        error: "Not found"
      });
    }

    const contentType = meta.contentType || "";

    if (!ALLOWED_TYPES.has(contentType)) {

      return res.status(415).json({
        error: "Unsupported media type"
      });
    }

    const upstream = await fetch(meta.url, {
      cache: "no-store"
    });

    if (!upstream.ok) {

      return res.status(404).json({
        error: "Not found"
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);

    res.setHeader("Content-Length", String(buffer.length));

    /* Ids are immutable, so the bytes behind one never change. Long cache
       keeps repeat views off the function entirely. */
    res.setHeader(
      "Cache-Control",
      `public, max-age=${ONE_YEAR}, s-maxage=${ONE_YEAR}, immutable`
    );

    res.setHeader("X-Content-Type-Options", "nosniff");

    res.setHeader("Content-Disposition", "inline");

    /* This asset is for this site only - not a hot-linking host. */
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

    if (req.method === "HEAD") {

      return res.status(200).end();
    }

    return res.status(200).send(buffer);

  } catch (err) {

    /* @vercel/blob subclasses BlobError without ever setting `.name`, so a
       missing blob arrives with name === "Error" and no `.status` - testing
       `err.name === "BlobNotFoundError"` was always false and every missing
       blob fell through to the generic 502 below, making a plain 404
       indistinguishable from a real upstream fault. Match on the class
       itself; `err.status === 404` stays as a defensive fallback. */
    const notFound =
      err
      && (
        err instanceof BlobNotFoundError
        || err.status === 404
      );

    if (notFound) {

      return res.status(404).json({
        error: "Not found"
      });
    }

    /* Log the message only - never the token or the full error object. */
    console.error(
      "img proxy upstream error:",
      err && err.message
    );

    return res.status(502).json({
      error: "Upstream error"
    });
  }
}
