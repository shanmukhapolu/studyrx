import { FIREBASE_API_KEY, firestoreDb } from "@/lib/firebase-config";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
  void idToken;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const userRef = doc(firestoreDb, "users", uid);

  await setDoc(
    userRef,
    {
      name: fullName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: "user",
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getUserProfile(idToken: string, uid: string): Promise<UserProfile | null> {
  void idToken;

  try {
    const userSnapshot = await getDoc(doc(firestoreDb, "users", uid));
    if (!userSnapshot.exists()) {
      return null;
    }

    const data = userSnapshot.data() as {
      name?: string;
      firstName?: string;
      lastName?: string;
    };

    if (typeof data.firstName === "string" || typeof data.lastName === "string") {
      return {
        firstName: data.firstName || "",
        lastName: data.lastName || "",
      };
    }

    if (typeof data.name === "string") {
      const [firstName = "", ...rest] = data.name.trim().split(/\s+/);
      return {
        firstName,
        lastName: rest.join(" "),
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to read Firestore profile", error);
    return null;
  }
}
