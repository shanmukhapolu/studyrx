import fs from "node:fs";

let state = { projectId: "", clientEmail: "", privateKey: "" };

function baseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${state.projectId}/databases/(default)/documents`;
}

async function createAccessToken() {
  return process.env.GOOGLE_OAUTH_ACCESS_TOKEN || "";
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (value && typeof value === "object" && typeof value.seconds === "number") {
    return { timestampValue: new Date(value.seconds * 1000).toISOString() };
  }
  if (typeof value === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = encodeValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

class Timestamp {
  constructor(seconds, nanoseconds) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
}

function firestore() {
  return {
    collection: (name) => ({
      doc: (id) => ({
        async set(data) {
          const token = await createAccessToken();
          if (!token) throw new Error("GOOGLE_OAUTH_ACCESS_TOKEN is required for local firebase-admin shim");
          const url = `${baseUrl()}/${name}/${id}`;
          const fields = {};
          for (const [k, v] of Object.entries(data || {})) fields[k] = encodeValue(v);
          const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ fields }),
          });
          if (!res.ok) throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`);
        },
      }),
    }),
  };
}

const admin = {
  initializeApp: ({ projectId }) => { state.projectId = projectId; },
  credential: { cert: (json) => { state.clientEmail = json.client_email; state.privateKey = json.private_key; return json; } },
  firestore,
};

admin.firestore.Timestamp = Timestamp;

export default admin;
