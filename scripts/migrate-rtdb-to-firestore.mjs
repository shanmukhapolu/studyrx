#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import admin from "firebase-admin";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function asFirestoreValue(value) {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    return value.map((item) => asFirestoreValue(item));
  }

  if (typeof value === "object") {
    if (typeof value._seconds === "number" && typeof value._nanoseconds === "number") {
      return new admin.firestore.Timestamp(value._seconds, value._nanoseconds);
    }

    const mapped = {};
    Object.entries(value).forEach(([key, child]) => {
      mapped[key] = asFirestoreValue(child);
    });
    return mapped;
  }

  return value;
}

function toTopLevelDocs(collectionValue) {
  if (collectionValue && typeof collectionValue === "object" && !Array.isArray(collectionValue)) {
    return Object.entries(collectionValue);
  }

  return [["root", { value: collectionValue }]];
}

async function migrate({ input, projectId, serviceAccount, dryRun = false }) {
  const absoluteInput = path.resolve(process.cwd(), input);
  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`Input file not found: ${absoluteInput}`);
  }

  const serviceAccountPath = path.resolve(process.cwd(), serviceAccount);
  const serviceAccountJson = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountJson),
    projectId,
  });

  const db = admin.firestore();
  const exported = JSON.parse(fs.readFileSync(absoluteInput, "utf8"));
  const topLevelCollections = Object.entries(exported);

  console.log(`Starting migration for ${topLevelCollections.length} top-level collections.`);

  let migratedDocuments = 0;
  const failures = [];

  for (const [collectionName, collectionValue] of topLevelCollections) {
    const entries = toTopLevelDocs(collectionValue);
    console.log(`Migrating collection '${collectionName}' with ${entries.length} documents.`);

    for (const [docId, rawDoc] of entries) {
      const normalizedDoc = asFirestoreValue(rawDoc);
      const finalDoc =
        collectionName === "users" && normalizedDoc && typeof normalizedDoc === "object"
          ? { role: "user", ...normalizedDoc }
          : normalizedDoc;

      try {
        if (!dryRun) {
          await db.collection(collectionName).doc(String(docId)).set(finalDoc, { merge: true });
        }
        migratedDocuments += 1;
      } catch (error) {
        failures.push({ collectionName, docId, error: String(error) });
        console.error(`[migration-error] ${collectionName}/${docId}`, error);
      }
    }
  }

  console.log(`Migration complete. Migrated ${migratedDocuments} documents.`);
  if (failures.length > 0) {
    console.error(`Encountered ${failures.length} failed writes.`);
    process.exitCode = 1;
  }
}

const args = parseArgs(process.argv.slice(2));

if (!args.input || !args.projectId || !args.serviceAccount) {
  console.error(
    "Usage: node scripts/migrate-rtdb-to-firestore.mjs --input ./rtdb-export.json --projectId studyrx2026 --serviceAccount ./service-account.json [--dryRun true]"
  );
  process.exit(1);
}

migrate({
  input: args.input,
  projectId: args.projectId,
  serviceAccount: args.serviceAccount,
  dryRun: args.dryRun === "true",
}).catch((error) => {
  console.error("Migration failed", error);
  process.exit(1);
});
