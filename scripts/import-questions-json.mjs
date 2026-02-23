#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const databaseUrl = process.env.FIREBASE_DATABASE_URL || "https://studyrx2026-default-rtdb.firebaseio.com";
const adminIdToken = process.env.FIREBASE_ADMIN_ID_TOKEN;

if (!adminIdToken) {
  console.error("Usage: FIREBASE_ADMIN_ID_TOKEN=... node scripts/import-questions-json.mjs");
  process.exit(1);
}

const folder = path.resolve("public/questions");
const files = (await fs.readdir(folder)).filter((name) => name.endsWith(".json"));

function normalizeDifficulty(value) {
  if (value === "Medium" || value === "Hard") return value;
  return "Easy";
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

    const res = await fetch(`${databaseUrl}/questions.json?auth=${encodeURIComponent(adminIdToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
