const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const {
  PUBLIC_OVERALL_ACCURACY_TOP5_PATH,
  buildLeaderboardUserRecord,
  buildPublicOverallAccuracyTop5,
} = require("./leaderboard-core");

admin.initializeApp();

const db = admin.database();

async function rebuildPublicTop5() {
  const snapshot = await db.ref("leaderboard/users").get();
  const records = snapshot.val() || {};
  await db.ref(PUBLIC_OVERALL_ACCURACY_TOP5_PATH).set(buildPublicOverallAccuracyTop5(records));
}

async function syncUserLeaderboard(uid) {
  const userSnapshot = await db.ref(`users/${uid}`).get();
  const user = userSnapshot.val();

  if (!user) {
    await db.ref(`leaderboard/users/${uid}`).remove();
    await rebuildPublicTop5();
    return;
  }

  const record = buildLeaderboardUserRecord(uid, user);
  await db.ref(`leaderboard/users/${uid}`).set(record);
  await rebuildPublicTop5();
}

exports.syncLeaderboardOnSessionWrite = functions.database
  .ref("/users/{uid}/events/{eventId}/sessions/{sessionId}")
  .onWrite(async (_change, context) => {
    await syncUserLeaderboard(context.params.uid);
  });

exports.backfillLeaderboards = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in as an admin to backfill leaderboards.");
  }

  const callerSnapshot = await db.ref(`users/${context.auth.uid}/role`).get();
  if (callerSnapshot.val() !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Only admins can backfill leaderboards.");
  }

  const usersSnapshot = await db.ref("users").get();
  const users = usersSnapshot.val() || {};
  const updates = {};

  Object.entries(users).forEach(([uid, user]) => {
    updates[`leaderboard/users/${uid}`] = buildLeaderboardUserRecord(uid, user || {});
  });

  await db.ref().update(updates);
  await rebuildPublicTop5();

  return {
    usersProcessed: Object.keys(users).length,
    top5Updated: true,
  };
});
