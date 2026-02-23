#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const projectId = process.env.FIREBASE_PROJECT_ID || "studyrx2026";
const adminIdToken = process.env.FIREBASE_ADMIN_ID_TOKEN;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

if (!adminIdToken) {
  console.error("Usage: FIREBASE_ADMIN_ID_TOKEN=... [FIREBASE_PROJECT_ID=...] node scripts/import-questions-json.mjs");
  process.exit(1);
}

const folder = path.resolve("public/questions");
const files = (await fs.readdir(folder)).filter((name) => name.endsWith(".json"));

function normalizeDifficulty(value) {
  if (value === "Medium" || value === "Hard") return value;
  return "Easy";
}

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toValue(v)])) } };
}

for (const file of files) {
  const eventId = file.replace(/\.json$/, "");
  const raw = await fs.readFile(path.join(folder, file), "utf8");
  const items = JSON.parse(raw);

  for (const item of items) {
    const options = Array.isArray(item.options) ? item.options.slice(0, 4) : ["", "", "", ""];
    while (options.length < 4) options.push("");

    const correctAnswerIndex = Math.max(0, options.findIndex((opt) => opt === item.correctAnswer));
    const payload = {
      question: String(item.question || ""),
      options,
      correctAnswerIndex,
      explanation: String(item.explanation || ""),
      eventId,
      category: String(item.category || "General"),
      difficulty: normalizeDifficulty(item.difficulty),
      tags: item.tag ? [String(item.tag)] : [],
      searchText: [item.question, ...(item.options || []), item.explanation, item.tag || ""].join(" ").toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await fetch(`${firestoreBase}/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminIdToken}` },
      body: JSON.stringify({ fields: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, toValue(v)])) }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Failed importing ${eventId}/${item.id}: ${res.status} ${body}`);
      process.exit(1);
    }
  }

  console.log(`Imported ${items.length} questions from ${file}`);
}

console.log("Import complete.");
