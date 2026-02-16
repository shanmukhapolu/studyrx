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

export interface UserProfile {
  firstName: string;
  lastName: string;
}

const AUTH_BASE = "https://identitytoolkit.googleapis.com/v1";
const SECURE_TOKEN_BASE = "https://securetoken.googleapis.com/v1";
const RTDB_BASE = FIREBASE_DATABASE_URL;

function toSession(data: any): AuthSession {
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: Number(data.expiresIn || 3600),
    user: {
      uid: data.localId,
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

export async function updateDisplayName(idToken: string, displayName: string) {
  const data = await authRequest("accounts:update", {
    idToken,
    displayName,
    returnSecureToken: true,
  });
  return toSession(data);
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

export async function saveUserProfile(idToken: string, uid: string, profile: UserProfile) {
  await fetch(`${RTDB_BASE}/users/${uid}/name.json?auth=${encodeURIComponent(idToken)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName: profile.firstName,
      lastName: profile.lastName,
      updatedAt: new Date().toISOString(),
    }),
  });
}

export async function getUserProfile(idToken: string, uid: string): Promise<UserProfile | null> {
  const res = await fetch(`${RTDB_BASE}/users/${uid}/name.json?auth=${encodeURIComponent(idToken)}`);

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  if (!data) {
    return null;
  }

  return {
    firstName: data.firstName || "",
    lastName: data.lastName || "",
  };
}
