#!/usr/bin/env node
/* =========================================================================
   HackChem — Leaderboard Stage 1 BACKFILL
   -------------------------------------------------------------------------
   Copies every existing score out of the authoritative location

       users/{uid}/lessons/{lessonId}

   into the read-optimised mirror collection

       leaderboard/{lessonId}/entries/{uid}

   WHY THIS MUST RUN FIRST
     The new leaderboard renders ONLY from the mirror collection. Users who
     are not mirrored are invisible until they next submit a lesson answer.
     Run this BEFORE deploying the Stage 1 code, or the board will look
     empty for everybody.

   IDEMPOTENT
     Every write is setDoc(..., {merge:true}) keyed by {uid}, so running the
     script twice produces the same documents. Safe to re-run, safe to
     interrupt and resume.

   SPARK PLAN
     Uses the Firebase Admin SDK over the public Firestore API. No Cloud
     Functions, no Cloud Run, no Cloud Scheduler, no billing required.

   USAGE
     1. npm i firebase-admin           (inside this tools/ folder or repo root)
     2. Download a service-account key:
        Firebase Console -> Project settings -> Service accounts ->
        "Generate new private key".  NEVER commit this file.
     3. export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json
     4. DRY RUN first (counts reads, writes nothing):
          node tools/backfill-leaderboard.mjs --dry-run
     5. Real run:
          node tools/backfill-leaderboard.mjs

   OPTIONAL FLAGS
     --project <id>       default hack-chem-v1
     --batch <n>          write batch size, default 400 (Firestore max 500)
     --limit-users <n>    stop after n users (for a partial trial)
     --only-lesson <id>   backfill a single lessonId

   COST ESTIMATE (see PR body for the arithmetic)
     reads  = users x lessons-that-exist   (1 getDocs per user, then
                                            .size on each lesson subcollection
                                            -> that is 1 read PER lesson doc)
     writes = number of entries actually created
   ========================================================================= */

import admin from "firebase-admin";

/* ------------------------------ args ---------------------------------- */
const argv = process.argv.slice(2);
const has  = (f) => argv.includes(f);
const val  = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i+1] ? argv[i+1] : d; };

const DRY_RUN     = has("--dry-run");
const PROJECT_ID  = val("--project", "hack-chem-v1");
const BATCH_SIZE  = parseInt(val("--batch", "400"), 10);
const LIMIT_USERS = parseInt(val("--limit-users", "0"), 10) || 0;
const ONLY_LESSON = val("--only-lesson", null);

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !has("--emulator")) {
  console.error(
    "\n[!] GOOGLE_APPLICATION_CREDENTIALS is not set.\n" +
    "    Download a service-account key from the Firebase Console and export the path.\n"
  );
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

/* ------------------------------ counters ------------------------------ */
const stats = { users: 0, lessonsSeen: 0, reads: 0, writes: 0, skippedNoScore: 0 };

function usersRef() {
  return db.collection("users");
}

async function fetchAllUsers() {
  let q = usersRef();
  if (LIMIT_USERS > 0) q = q.limit(LIMIT_USERS);
  const snap = await q.get();
  stats.reads += snap.size;
  return snap.docs;
}

async function main() {
  console.log(`\n=== HackChem leaderboard backfill ===`);
  console.log(`project     : ${PROJECT_ID}`);
  console.log(`mode        : ${DRY_RUN ? "DRY RUN (no writes)" : "REAL RUN"}`);
  console.log(`batch size  : ${BATCH_SIZE}`);
  if (LIMIT_USERS) console.log(`limit users : ${LIMIT_USERS}`);
  if (ONLY_LESSON) console.log(`only lesson : ${ONLY_LESSON}`);
  console.log("");

  const userDocs = await fetchAllUsers();
  console.log(`users found : ${userDocs.length}`);
  stats.users = userDocs.length;

  let batch = db.batch();
  let pending = 0;

  const flush = async () => {
    if (pending === 0) return;
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

  for (const userDoc of userDocs) {
    const userData = userDoc.data() || {};
    const uid = userDoc.id;

    const name   = userData.name || "Unknown";
    const avatar = userData.avatar || "";

    const lessonsSnap = await userDoc.ref.collection("lessons").get();
    stats.reads += lessonsSnap.size;

    for (const lessonDoc of lessonsSnap.docs) {
      const lessonId = lessonDoc.id;

      if (ONLY_LESSON && lessonId !== ONLY_LESSON) continue;

      stats.lessonsSeen++;

      const score = Number((lessonDoc.data() || {}).bestScore) || 0;

      // The renderer ignores score <= 0, so do not mirror those.
      if (score <= 0) {
        stats.skippedNoScore++;
        continue;
      }

      const entryRef = db
        .collection("leaderboard")
        .doc(lessonId)
        .collection("entries")
        .doc(uid);

      batch.set(
        entryRef,
        {
          uid,
          name,
          avatar,
          score,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      pending++;

      if (pending >= BATCH_SIZE) await flush();
    }
  }

  await flush();

  console.log("\n--- summary ---");
  console.log(`users processed     : ${stats.users}`);
  console.log(`lesson docs read    : ${stats.lessonsSeen}`);
  console.log(`skipped (score<=0)  : ${stats.skippedNoScore}`);
  console.log(`entries written     : ${stats.writes}`);
  console.log(`estimated reads     : ${stats.reads}`);
  console.log(
    `Spark daily quota   : ${((stats.reads / 50000) * 100).toFixed(2)}% read, ` +
    `${((stats.writes / 20000) * 100).toFixed(2)}% write`
  );
  if (DRY_RUN) console.log("\nDRY RUN — nothing was written.");
  console.log("");
}

main().then(
  () => process.exit(0),
  (err) => { console.error("\nBACKFILL FAILED:", err); process.exit(1); }
);
