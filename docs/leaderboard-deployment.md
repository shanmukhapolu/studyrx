# Leaderboard deployment and backfill

The public leaderboard reads only sanitized rows from:

```text
publicLeaderboards/overall/accuracy/top5
```

Raw user profiles, raw sessions, emails, and question attempts stay under `users` and are not publicly readable.

## One-time Firebase setup

From the repo root:

```bash
npm install -g firebase-tools
firebase login
firebase use studyrx2026
firebase deploy --only database,functions
```

## One-time backfill for existing sessions

Existing sessions will not appear on the public leaderboard until sanitized leaderboard records are generated once. After deploying functions, run this from the repo root with a Firebase Admin service-account JSON that has Realtime Database access:

```bash
cd functions
npm install
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json npm run backfill:leaderboards
```

That command computes sanitized records in `leaderboard/users` and writes the current public top 5 to `publicLeaderboards/overall/accuracy/top5`.

## Automatic updates after setup

After deployment, `syncLeaderboardOnSessionWrite` runs whenever a session is written to:

```text
users/{uid}/events/{eventId}/sessions/{sessionId}
```

The function recomputes that user's sanitized leaderboard record, then refreshes the public top 5. No client can write `leaderboard/users` or `publicLeaderboards`; Firebase Admin SDK writes from Cloud Functions bypass Realtime Database security rules.
