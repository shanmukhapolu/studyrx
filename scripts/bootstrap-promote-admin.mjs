#!/usr/bin/env node

const databaseUrl = process.env.FIREBASE_DATABASE_URL || "https://studyrx2026-default-rtdb.firebaseio.com";
const adminIdToken = process.env.FIREBASE_ADMIN_ID_TOKEN;
const targetUid = process.env.TARGET_UID;

if (!adminIdToken || !targetUid) {
  console.error("Usage: FIREBASE_ADMIN_ID_TOKEN=... TARGET_UID=... node scripts/bootstrap-promote-admin.mjs");
  process.exit(1);
}

const endpoint = `${databaseUrl}/users/${encodeURIComponent(targetUid)}/role.json?auth=${encodeURIComponent(adminIdToken)}`;

const res = await fetch(endpoint, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify("admin"),
});

if (!res.ok) {
  const body = await res.text().catch(() => "");
  console.error(`Failed (${res.status}): ${body}`);
  process.exit(1);
}

console.log(`Promoted ${targetUid} to admin.`);
