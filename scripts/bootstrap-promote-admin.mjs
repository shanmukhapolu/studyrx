#!/usr/bin/env node

const projectId = process.env.FIREBASE_PROJECT_ID || "studyrx2026";
const adminIdToken = process.env.FIREBASE_ADMIN_ID_TOKEN;
const targetUid = process.env.TARGET_UID;

if (!adminIdToken || !targetUid) {
  console.error("Usage: FIREBASE_ADMIN_ID_TOKEN=... TARGET_UID=... [FIREBASE_PROJECT_ID=...] node scripts/bootstrap-promote-admin.mjs");
  process.exit(1);
}

const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(targetUid)}`;

const res = await fetch(endpoint, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminIdToken}` },
  body: JSON.stringify({
    fields: {
      role: { stringValue: "admin" },
      updatedAt: { stringValue: new Date().toISOString() },
    },
  }),
});

if (!res.ok) {
  const body = await res.text().catch(() => "");
  console.error(`Failed (${res.status}): ${body}`);
  process.exit(1);
}

console.log(`Promoted ${targetUid} to admin.`);
