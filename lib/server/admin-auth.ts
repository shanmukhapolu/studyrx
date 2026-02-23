import { firestoreGetDocument } from "@/lib/firestore-rest";

export type ServerUserRole = "user" | "admin";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getUidFromToken(idToken: string): string | null {
  const payload = decodeJwtPayload(idToken);
  const uid = (payload?.user_id || payload?.sub) as string | undefined;
  return uid || null;
}

export async function getRoleForUid(idToken: string, uid: string): Promise<ServerUserRole> {
  const userDoc = await firestoreGetDocument(idToken, `users/${uid}`);
  return userDoc?.role === "admin" ? "admin" : "user";
}

export async function assertAdmin(idToken: string, uid?: string | null): Promise<boolean> {
  const resolvedUid = uid || getUidFromToken(idToken);
  if (!resolvedUid) return false;
  const role = await getRoleForUid(idToken, resolvedUid);
  return role === "admin";
}
