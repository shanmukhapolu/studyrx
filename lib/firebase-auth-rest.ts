import { FIREBASE_API_KEY, FIREBASE_DATABASE_URL } from "@/lib/firebase-config";

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
}

export interface AuthSession {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export type UserRole = "user" | "admin";

export interface UserProfile {
  firstName: string;
  lastName: string;
  role: UserRole;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  totalPracticeSeconds: number;
}

export interface AdminUserRecord extends UserProfile {
  uid: string;
  name: string;
}

const AUTH_BASE = "https://identitytoolkit.googleapis.com/v1";
const SECURE_TOKEN_BASE = "https://securetoken.googleapis.com/v1";
const RTDB_BASE = FIREBASE_DATABASE_URL;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveUid(data: any): string {
  const direct = data?.localId || data?.user_id || data?.userId;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const token = typeof data?.idToken === "string" ? data.idToken : null;
  if (token) {
    const payload = decodeJwtPayload(token);
    const fromToken = (payload?.user_id || payload?.sub) as string | undefined;
    if (typeof fromToken === "string" && fromToken.length > 0) {
      return fromToken;
    }
  }

  return "";
}

function toSession(data: any): AuthSession {
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: Number(data.expiresIn || 3600),
    user: {
      uid: resolveUid(data),
      email: data.email,
      displayName: data.displayName,
    },
  };
}

async function authRequest(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${AUTH_BASE}/${endpoint}?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Authentication request failed");
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const data = await authRequest("accounts:signUp", {
    email,
    password,
    returnSecureToken: true,
  });
  return toSession(data);
}

export async function signInWithEmail(email: string, password: string) {
  const data = await authRequest("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
  return toSession(data);
}

export async function signInWithGoogleIdToken(idToken: string) {
  const data = await authRequest("accounts:signInWithIdp", {
    requestUri: window.location.origin,
    postBody: `id_token=${idToken}&providerId=google.com`,
    returnSecureToken: true,
    returnIdpCredential: true,
  });
  return toSession(data);
}

export async function updateDisplayName(idToken: string, displayName: string, fallbackUid?: string) {
  const data = await authRequest("accounts:update", {
    idToken,
    displayName,
    returnSecureToken: true,
  });
  const session = toSession(data);
  if (!session.user.uid && fallbackUid) {
    session.user.uid = fallbackUid;
  }
  return session;
}

export async function sendPasswordResetEmail(email: string) {
  await authRequest("accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
  });
}

export async function refreshIdToken(refreshToken: string) {
  const res = await fetch(`${SECURE_TOKEN_BASE}/token?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Token refresh failed");
  }

  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in || 3600),
    uid: data.user_id,
  };
}

function splitName(fullName: string) {
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

function composeName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export async function saveUserProfile(idToken: string, uid: string, profile: UserProfile) {
  const fullName = composeName(profile.firstName, profile.lastName);

  const profileRes = await fetch(`${RTDB_BASE}/users/${uid}.json?auth=${encodeURIComponent(idToken)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: fullName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      email: profile.email,
      createdAt: profile.createdAt,
      lastLoginAt: profile.lastLoginAt,
      loginCount: profile.loginCount,
      totalPracticeSeconds: profile.totalPracticeSeconds,
    }),
  });

  if (!profileRes.ok) {
    const text = await profileRes.text().catch(() => "");
    throw new Error(`Failed to save profile: ${profileRes.status} ${text}`);
  }
}

export async function touchUserLogin(idToken: string, uid: string, input: { email: string; fallbackName: string }) {
  const existing = await getUserProfile(idToken, uid);
  const now = new Date().toISOString();
  const base: UserProfile = existing || {
    ...splitName(input.fallbackName),
    role: "user",
    email: input.email,
    createdAt: now,
    lastLoginAt: now,
    loginCount: 0,
    totalPracticeSeconds: 0,
  };

  const next: UserProfile = {
    ...base,
    email: input.email || base.email,
    lastLoginAt: now,
    loginCount: (base.loginCount || 0) + 1,
  };

  await saveUserProfile(idToken, uid, next);
  return next;
}

export async function getUserProfile(idToken: string, uid: string): Promise<UserProfile | null> {
  const profileRes = await fetch(`${RTDB_BASE}/users/${uid}.json?auth=${encodeURIComponent(idToken)}`);
  if (!profileRes.ok) {
    return null;
  }

  const profileData = await profileRes.json();
  if (!profileData) {
    return null;
  }

  const role = profileData.role === "admin" ? "admin" : "user";
  const name = typeof profileData.name === "string"
    ? profileData.name
    : composeName(String(profileData.firstName || ""), String(profileData.lastName || ""));
  const split = splitName(name);

  return {
    firstName: split.firstName,
    lastName: split.lastName,
    role,
    email: String(profileData.email || ""),
    createdAt: String(profileData.createdAt || new Date().toISOString()),
    lastLoginAt: String(profileData.lastLoginAt || profileData.createdAt || new Date().toISOString()),
    loginCount: Number(profileData.loginCount || 0),
    totalPracticeSeconds: Number(profileData.totalPracticeSeconds || 0),
  };
}

export async function listUsers(idToken: string): Promise<AdminUserRecord[]> {
  const res = await fetch(`${RTDB_BASE}/users.json?auth=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new Error("Failed to list users");

  const data = (await res.json()) as Record<string, any> | null;
  return Object.entries(data || {}).map(([uid, raw]) => {
    const name = typeof raw?.name === "string" ? raw.name : composeName(String(raw?.firstName || ""), String(raw?.lastName || ""));
    const split = splitName(name);
    return {
      uid,
      name,
      firstName: split.firstName,
      lastName: split.lastName,
      role: raw?.role === "admin" ? "admin" : "user",
      email: String(raw?.email || ""),
      createdAt: String(raw?.createdAt || ""),
      lastLoginAt: String(raw?.lastLoginAt || ""),
      loginCount: Number(raw?.loginCount || 0),
      totalPracticeSeconds: Number(raw?.totalPracticeSeconds || 0),
    };
  });
}

export async function updateUserName(idToken: string, uid: string, name: string) {
  const trimmed = name.trim();
  const split = splitName(trimmed);
  const res = await fetch(`${RTDB_BASE}/users/${uid}.json?auth=${encodeURIComponent(idToken)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: trimmed,
      firstName: split.firstName,
      lastName: split.lastName,
      updatedAt: new Date().toISOString(),
    }),
  });

  if (!res.ok) throw new Error("Failed to update user name");
}

export async function deleteUserData(idToken: string, uid: string) {
  const res = await fetch(`${RTDB_BASE}/users/${uid}.json?auth=${encodeURIComponent(idToken)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete user data");
}

export async function getUserRole(idToken: string, uid: string): Promise<UserRole> {
  const roleRes = await fetch(`${RTDB_BASE}/users/${uid}/role.json?auth=${encodeURIComponent(idToken)}`);
  if (!roleRes.ok) {
    return "user";
  }

  const role = await roleRes.json();
  return role === "admin" ? "admin" : "user";
}

export async function setUserRole(idToken: string, uid: string, role: UserRole) {
  const roleRes = await fetch(`${RTDB_BASE}/users/${uid}/role.json?auth=${encodeURIComponent(idToken)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(role),
  });

  if (!roleRes.ok) {
    const text = await roleRes.text().catch(() => "");
    throw new Error(`Failed to set role: ${roleRes.status} ${text}`);
  }
}
