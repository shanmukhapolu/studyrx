const admin = require("firebase-admin");
const {
  PUBLIC_OVERALL_ACCURACY_TOP5_PATH,
  buildLeaderboardUserRecord,
  buildPublicOverallAccuracyTop5,
} = require("./leaderboard-core");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://studyrx2026-default-rtdb.firebaseio.com",
});

async function main() {
  const db = admin.database();
  const usersSnapshot = await db.ref("users").get();
  const users = usersSnapshot.val() || {};
  const records = {};
  const updates = {};

  Object.entries(users).forEach(([uid, user]) => {
    const record = buildLeaderboardUserRecord(uid, user || {});
    records[uid] = record;
    updates[`leaderboard/users/${uid}`] = record;
  });

  updates[PUBLIC_OVERALL_ACCURACY_TOP5_PATH] = buildPublicOverallAccuracyTop5(records);
  await db.ref().update(updates);
  console.log(`Backfilled ${Object.keys(records).length} leaderboard records and refreshed public top 5.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
