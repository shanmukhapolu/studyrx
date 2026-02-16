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
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();

  const profileRes = await fetch(`${RTDB_BASE}/users/${uid}/profile.json?auth=${encodeURIComponent(idToken)}`, {
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

  if (!profileRes.ok) {
    // Some stricter rulesets may not allow this optional profile object path.
    // We still persist the required display name string at /name below.
    console.warn("Profile object write blocked by rules; continuing with /name fallback.");
  }

  const nameRes = await fetch(`${RTDB_BASE}/users/${uid}/name.json?auth=${encodeURIComponent(idToken)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fullName),
  });

  if (!nameRes.ok) {
    const text = await nameRes.text().catch(() => "");
    throw new Error(`Failed to save display name: ${nameRes.status} ${text}`);
  }
}

export async function getUserProfile(idToken: string, uid: string): Promise<UserProfile | null> {
  const profileRes = await fetch(`${RTDB_BASE}/users/${uid}/profile.json?auth=${encodeURIComponent(idToken)}`);
  if (profileRes.ok) {
    const profileData = await profileRes.json();
    if (profileData && (profileData.firstName || profileData.lastName)) {
      return {
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
      };
    }
  }

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

  return {
    firstName: nameData.firstName || "",
    lastName: nameData.lastName || "",
  };
}
