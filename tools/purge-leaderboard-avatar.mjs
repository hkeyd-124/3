#!/usr/bin/env node
/* =========================================================================
   HackChem — Leaderboard avatar PURGE (one-off, egress recovery)
   -------------------------------------------------------------------------
   DELETES the `avatar` field from every existing mirror document

       leaderboard/{lessonId}/entries/{uid}

   WHY THIS EXISTS
     The mirror used to denormalise `users/{uid}.avatar` — a base64 data URI
     measured at up to ~200 KB — into every entry. Nothing rendered it:
     renderLeaderboard() builds a row from rank / name / score / badge, and
     tabs/leaderboard.html has no avatar markup. So the board shipped ~200 KB
     of dead bytes per (student x lesson) on every top-10 read.

     js/leaderboard.js now sends `avatar: deleteField()` instead, which purges
     each student's OWN copies as they finish that lesson again. This script
     is for the copies that lazy path can never reach: students who finished
     a lesson once and never come back.

   DRY RUN IS THE DEFAULT
     Without --apply this script only READS and REPORTS. It writes nothing.
     That is the opposite of tools/backfill-leaderboard.mjs (which writes by
     default) on purpose: a backfill that is skipped is merely annoying, a
     purge that fires by accident destroys data.

   NON-DESTRUCTIVE TO EVERYTHING ELSE
     Only `avatar` is deleted. uid / name / score / updatedAt are untouched,
     so ranking, ordering (score DESC, updatedAt ASC) and the top-10 query
     keep working byte for byte.

   NOT IDEMPOTENT IN THE USUAL SENSE, BUT SAFE TO RE-RUN
     Deleting a field that is already absent is a no-op, and documents without
     `avatar` are never added to the write batch (see the `has()` guard), so a
     second run reports 0 pending and writes nothing.

   COST
     reads  = number of entry documents scanned
     writes = number of entries that actually carried an `avatar`
     On Spark (50k reads / 20k writes per day) a few hundred entries is
     nothing; the script prints the percentage so you can see it first.

   USAGE
     1. npm i firebase-admin
     2. Firebase Console -> Project settings -> Service accounts ->
        "Generate new private key".  NEVER commit that file.
     3. export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json
     4. DRY RUN (default, reads only):
          node tools/purge-leaderboard-avatar.mjs
     5. Real run (writes):
          node tools/purge-leaderboard-avatar.mjs --apply

   OPTIONAL FLAGS
     --apply              actually delete (WITHOUT this flag: dry run)
     --project <id>       default hack-chem-v1
     --batch <n>          write batch size, default 400 (Firestore max 500)
     --limit <n>          stop after n entry documents scanned
     --only-lesson <id>   purge a single lessonId
     --emulator           allow running against the local emulator
   ========================================================================= */

import admin from "firebase-admin";

/* ------------------------------ args ---------------------------------- */
const argv = process.argv.slice(2);
const has  = (f) => argv.includes(f);
const val  = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i+1] ? argv[i+1] : d; };

const APPLY       = has("--apply");
const DRY_RUN     = !APPLY;
const PROJECT_ID  = val("--project", "hack-chem-v1");
const BATCH_SIZE  = parseInt(val("--batch", "400"), 10);
const LIMIT       = parseInt(val("--limit", "0"), 10) || 0;
const ONLY_LESSON = val("--only-lesson", null);
const EMULATOR    = has("--emulator");

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !EMULATOR) {
  console.error(
    "\n[!] GOOGLE_APPLICATION_CREDENTIALS is not set.\n" +
    "    Download a service-account key from the Firebase Console and export the path.\n" +
    "    Never commit that file.\n"
  );
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

/* ------------------------------ counters ------------------------------ */
const stats = {
  lessons: 0,
  scanned: 0,
  withAvatar: 0,
  bytes: 0,
  writes: 0,
  errors: 0
};

/* Roughly how much a base64 avatar contributes to a document. Firestore
   bills document size, so this is the number the egress story is about. */
function avatarBytes(value) {
  return typeof value === "string" ? Buffer.byteLength(value, "utf8") : 0;
}

function human(n) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + " MB";
  if (n >= 1024) return (n / 1024).toFixed(1) + " KB";
  return n + " B";
}

async function main() {
  console.log("\n=== HackChem leaderboard avatar purge ===");
  console.log("project     : " + PROJECT_ID);
  console.log("mode        : " + (DRY_RUN ? "DRY RUN (reads only, NO writes)" : "REAL RUN (deletes avatar)"));
  console.log("batch size  : " + BATCH_SIZE);
  if (LIMIT) console.log("limit       : " + LIMIT + " entries scanned");
  if (ONLY_LESSON) console.log("only lesson : " + ONLY_LESSON);
  console.log("");

  /* ---- ONE collection-group query for every entry document ----
     `leaderboard/{lessonId}` is a PARENT-ONLY path: no document is ever
     written there, so db.collection("leaderboard").get() comes back EMPTY
     and a nested per-lesson loop never runs a single iteration. The entries
     live in the `entries` subcollection, which is exactly what
     collectionGroup() reaches. */
  const lessonIds = new Set();

  let batch = db.batch();
  let pending = 0;

  const flush = async () => {
    if (pending === 0) return;
    /* In a dry run the batch is discarded, never committed. `stats.writes`
       still counts what WOULD have been written so the report is useful. */
    if (DRY_RUN) {
      stats.writes += pending;
      pending = 0;
      batch = db.batch();
      return;
    }
    await batch.commit();
    stats.writes += pending;
    pending = 0;
    batch = db.batch();
  };

  const entriesSnap = await db.collectionGroup("entries").get();

  for (const entryDoc of entriesSnap.docs) {
    if (LIMIT && stats.scanned >= LIMIT) break;

    /* leaderboard/{lessonId}/entries/{uid} -> ref.parent.parent IS the lesson
       document, so its id is the lessonId. Nothing is queried per lesson. */
    const lessonParent = entryDoc.ref.parent && entryDoc.ref.parent.parent;
    const lessonId = lessonParent ? lessonParent.id : null;
    if (!lessonId) continue;
    if (ONLY_LESSON && lessonId !== ONLY_LESSON) continue;

    lessonIds.add(lessonId);
    stats.scanned++;

    const data = entryDoc.data() || {};

    /* Only documents that STILL carry the field join the batch.
       This is what makes a second run a no-op. */
    if (!Object.prototype.hasOwnProperty.call(data, "avatar")) continue;

    stats.withAvatar++;
    stats.bytes += avatarBytes(data.avatar);

    batch.update(entryDoc.ref, { avatar: admin.firestore.FieldValue.delete() });
    pending++;

    if (pending >= BATCH_SIZE) await flush();
  }

  await flush();

  stats.lessons = lessonIds.size;
  console.log("lesson docs : " + stats.lessons);
  if (stats.scanned === 0) {
    console.log("\nNothing to do \u2014 no leaderboard/{lessonId}/entries documents found.\n");
    return;
  }

  const sparkReads  = ((stats.scanned / 50000) * 100).toFixed(2);
  const sparkWrites = ((stats.writes  / 20000) * 100).toFixed(2);

  console.log("\n--- summary ---");
  console.log("entries scanned     : " + stats.scanned);
  console.log("entries with avatar : " + stats.withAvatar);
  console.log("avatar bytes found  : " + human(stats.bytes));
  console.log((DRY_RUN ? "entries WOULD purge : " : "entries purged      : ") + stats.writes);
  console.log("read cost           : " + sparkReads + "% of the Spark daily read quota");
  console.log("write cost          : " + sparkWrites + "% of the Spark daily write quota");
  if (stats.errors) console.log("errors              : " + stats.errors);

  if (DRY_RUN) {
    console.log("\nDRY RUN — nothing was written.");
    console.log("Re-run with --apply to delete the field.\n");
  } else {
    console.log("\nDone. Re-running is safe: already-clean documents are skipped.\n");
  }
}

main().then(
  () => process.exit(0),
  (err) => { console.error("\nPURGE FAILED:", err); process.exit(1); }
);
