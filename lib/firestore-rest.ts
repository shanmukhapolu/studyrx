import { FIRESTORE_REST_BASE_URL } from "@/lib/firebase-config";

const FIRESTORE_BASE = FIRESTORE_REST_BASE_URL;

export type FirestorePrimitive = string | number | boolean | null;
export type FirestoreData = FirestorePrimitive | FirestoreData[] | { [key: string]: FirestoreData };

function toValue(value: FirestoreData): any {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };

  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toValue(v as FirestoreData)])),
    },
  };
}

function fromValue(value: any): any {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("integerValue" in value) return Number(value.integerValue || 0);
  if ("doubleValue" in value) return Number(value.doubleValue || 0);
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue?.values || []).map(fromValue);
  if ("mapValue" in value) {
    const fields = value.mapValue?.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]));
  }
  if ("timestampValue" in value) return value.timestampValue;
  return null;
}

function docUrl(documentPath: string) {
  return `${FIRESTORE_BASE}/${documentPath}`;
}

function authHeaders(idToken: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${idToken}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export async function firestoreGetDocument(idToken: string, documentPath: string): Promise<any | null> {
  const res = await fetch(docUrl(documentPath), { headers: authHeaders(idToken) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to read document: ${documentPath}`);
  const doc = await res.json();
  return fromValue({ mapValue: { fields: doc.fields || {} } });
}

export async function firestoreSetDocument(idToken: string, documentPath: string, data: Record<string, FirestoreData>, options?: { merge?: boolean }) {
  const body = JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) });
  const method = options?.merge ? "PATCH" : "PUT";
  const url = options?.merge ? `${docUrl(documentPath)}?currentDocument.exists=true` : docUrl(documentPath);
  const res = await fetch(url, { method, headers: authHeaders(idToken, true), body });

  if (!res.ok && options?.merge) {
    const fallback = await fetch(docUrl(documentPath), { method: "PATCH", headers: authHeaders(idToken, true), body });
    if (!fallback.ok) throw new Error(`Failed to write document: ${documentPath}`);
    return;
  }

  if (!res.ok) throw new Error(`Failed to write document: ${documentPath}`);
}

export async function firestorePatchDocument(idToken: string, documentPath: string, data: Record<string, FirestoreData>) {
  const body = JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) });
  const res = await fetch(docUrl(documentPath), {
    method: "PATCH",
    headers: authHeaders(idToken, true),
    body,
  });

  if (!res.ok) throw new Error(`Failed to patch document: ${documentPath}`);
}

export async function firestoreDeleteDocument(idToken: string, documentPath: string) {
  const res = await fetch(docUrl(documentPath), {
    method: "DELETE",
    headers: authHeaders(idToken),
  });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to delete document: ${documentPath}`);
}

export async function firestoreListCollection(idToken: string, collectionPath: string): Promise<Array<{ id: string; data: any }>> {
  const res = await fetch(`${FIRESTORE_BASE}/${collectionPath}`, { headers: authHeaders(idToken) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Failed to list collection: ${collectionPath}`);

  const json = await res.json();
  const docs = json.documents || [];
  return docs.map((doc: any) => {
    const name = String(doc.name || "");
    const id = name.split("/").pop() || "";
    const data = fromValue({ mapValue: { fields: doc.fields || {} } });
    return { id, data };
  });
}

export async function firestoreRunQuery(idToken: string, structuredQuery: any): Promise<Array<{ id: string; data: any }>> {
  const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: "POST",
    headers: authHeaders(idToken, true),
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) throw new Error("Failed to query Firestore");

  const rows = (await res.json()) as any[];
  return rows
    .filter((row) => row.document)
    .map((row) => {
      const doc = row.document;
      const id = String(doc.name || "").split("/").pop() || "";
      const data = fromValue({ mapValue: { fields: doc.fields || {} } });
      return { id, data };
    });
}
