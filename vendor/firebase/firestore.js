export function getFirestore(app) { return { app }; }

function toBaseUrl(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function getProjectId(ref) {
  return ref.app?.config?.projectId || ref.projectId;
}

function authHeader() {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem("studyrx_auth_session");
  if (!raw) return {};
  try {
    const session = JSON.parse(raw);
    if (session?.idToken) {
      return { Authorization: `Bearer ${session.idToken}` };
    }
  } catch {}
  return {};
}

function encodeFields(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map((v) => encodeFields(v)) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = encodeFields(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function decodeFields(value) {
  if (!value) return null;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFields);
  if ("mapValue" in value) {
    const out = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) out[k] = decodeFields(v);
    return out;
  }
  return null;
}

function decodeDoc(doc) {
  const data = {};
  for (const [k, v] of Object.entries(doc.fields || {})) data[k] = decodeFields(v);
  return data;
}

export function collection(db, ...segments) { return { kind: "collection", db, segments }; }
export function query(col) { return col; }
export function doc(db, ...segments) { return { kind: "doc", db, segments }; }

export async function getDoc(ref) {
  const projectId = getProjectId(ref.db || ref);
  const url = `${toBaseUrl(projectId)}/${ref.segments.join("/")}`;
  const res = await fetch(url, { headers: { ...authHeader() } });
  if (!res.ok) return { exists: () => false, data: () => undefined };
  const payload = await res.json();
  const decoded = decodeDoc(payload);
  return { exists: () => true, data: () => decoded };
}

export async function getDocs(ref) {
  const projectId = getProjectId(ref.db || ref);
  const url = `${toBaseUrl(projectId)}/${ref.segments.join("/")}`;
  const res = await fetch(url, { headers: { ...authHeader() } });
  if (!res.ok) return { forEach: () => {}, docs: [] };
  const payload = await res.json();
  const docs = (payload.documents || []).map((d) => ({ id: d.name.split("/").pop(), data: () => decodeDoc(d), ref: { _name: d.name } }));
  return { forEach: (cb) => docs.forEach(cb), docs };
}

export async function setDoc(ref, data, options = {}) {
  const projectId = getProjectId(ref.db || ref);
  const mask = options.merge ? "?currentDocument.exists=true" : "";
  const url = `${toBaseUrl(projectId)}/${ref.segments.join("/")}${mask}`;
  await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data || {}).map(([k,v]) => [k, encodeFields(v)])) }) });
}

export async function updateDoc(ref, data) { return setDoc(ref, data, { merge: true }); }

export async function deleteDoc(ref) {
  const projectId = getProjectId(ref.db || ref);
  const name = ref._name || `${toBaseUrl(projectId)}/${ref.segments.join("/")}`;
  await fetch(name, { method: "DELETE", headers: { ...authHeader() } });
}

export class Timestamp {
  constructor(seconds, nanoseconds) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
}
