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
const AUTH_SESSION_STORAGE_KEY = "studyrx_auth_session";

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

type StoredAuthSession = AuthSession & {
  expiresAt?: number;
};

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

function readStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

async function resolveWritableIdToken(idToken?: string) {
  if (idToken && idToken.length > 0) {
    return idToken;
  }

  const stored = readStoredAuthSession();
  if (!stored?.refreshToken && !stored?.idToken) {
    throw new Error("Missing authentication token for profile write.");
  }

  if (stored?.idToken && (stored.expiresAt ?? 0) > Date.now() + 30_000) {
    return stored.idToken;
  }

  if (!stored?.refreshToken) {
    return stored?.idToken ?? "";
  }

  const refreshed = await refreshIdToken(stored.refreshToken);
  const nextSession: StoredAuthSession = {
    ...stored,
    idToken: refreshed.idToken,
    refreshToken: refreshed.refreshToken,
    expiresIn: refreshed.expiresIn,
    expiresAt: Date.now() + refreshed.expiresIn * 1000,
    user: {
      ...stored.user,
      uid: refreshed.uid || stored.user.uid,
    },
  };
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  return nextSession.idToken;
}

export async function sendPasswordResetEmail(email: string) {
  await authRequest("accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
  });
}

export async function saveUserProfile(idToken: string | undefined, uid: string, profile: UserProfile) {
  const writableIdToken = await resolveWritableIdToken(idToken);
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  const nameRes = await fetch(`${RTDB_BASE}/users/${uid}/name.json?auth=${encodeURIComponent(writableIdToken)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${writableIdToken}`,
    },
    body: JSON.stringify(fullName),
  });

  if (!nameRes.ok) {
    const text = await nameRes.text().catch(() => "");
    throw new Error(`Failed to save display name: ${nameRes.status} ${text}`);
  }
}

export async function getUserProfile(idToken: string, uid: string): Promise<UserProfile | null> {
  const nameRes = await fetch(`${RTDB_BASE}/users/${uid}/name.json?auth=${encodeURIComponent(idToken)}`);
  if (!nameRes.ok) {
    return null;
  }

  const nameData = await nameRes.json();
  if (!nameData) {
    return null;
  }

  if (typeof nameData === "string") {
    const [firstName = "", ...rest] = nameData.trim().split(/\s+/);
    return {
      firstName,
      lastName: rest.join(" "),
    };
  }

  // Legacy compatibility in case older data used object shape.
  return {
    firstName: nameData.firstName || "",
    lastName: nameData.lastName || "",
  };
}
