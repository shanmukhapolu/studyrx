"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  getUserProfile,
  refreshIdToken,
  signInWithEmail,
  signInWithGoogleIdToken,
  signUpWithEmail,
  updateDisplayName,
  type AuthSession,
  type AuthUser,
  type UserProfile,
  type UserRole,
} from "@/lib/firebase-auth-rest";

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  signInWithGoogleCredential: (credential: string) => Promise<void>;
  signOut: () => void;
}

const STORAGE_KEY = "studyrx_auth_session";
const AUTH_COOKIE_KEY = "studyrx_auth_token";
const UID_COOKIE_KEY = "studyrx_auth_uid";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);


function syncAuthCookies(session: AuthSession | null) {
  if (typeof document === "undefined") return;

  if (!session) {
    document.cookie = `${AUTH_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${UID_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  const maxAge = Math.max(0, Math.floor(session.expiresIn));
  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(session.idToken)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  document.cookie = `${UID_COOKIE_KEY}=${encodeURIComponent(session.user.uid)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

function normalizeRole(profile: Partial<UserProfile> & { firstName: string; lastName: string }): UserProfile {
  const now = new Date().toISOString();
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: (profile.role || "user") as UserRole,
    email: profile.email || "",
    createdAt: profile.createdAt || now,
    lastLoginAt: profile.lastLoginAt || now,
    loginCount: Number(profile.loginCount || 0),
    totalPracticeSeconds: Number(profile.totalPracticeSeconds || 0),
  };
}

function saveSession(session: AuthSession) {
  const normalized = ensureSessionUid(session);
  const expiresAt = Date.now() + normalized.expiresIn * 1000;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...normalized,
      expiresAt,
    })
  );
  syncAuthCookies(normalized);
}

function readSession(): (AuthSession & { expiresAt: number }) | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}



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

function ensureSessionUid<T extends AuthSession>(session: T): T {
  if (session.user.uid) return session;

  const payload = decodeJwtPayload(session.idToken);
  const uid = (payload?.user_id || payload?.sub) as string | undefined;
  if (!uid) {
    throw new Error("Authentication session missing user ID. Please sign in again.");
  }

  return {
    ...session,
    user: {
      ...session.user,
      uid,
    },
  };
}

function profileFromDisplayName(displayName?: string | null): UserProfile | null {
  const normalized = (displayName || "").trim();
  if (!normalized) return null;

  const [firstName = "", ...rest] = normalized.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" "),
    role: "user",
    email: "",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    loginCount: 0,
    totalPracticeSeconds: 0,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const bootstrapProfile = async (session: AuthSession, input?: { firstName?: string; lastName?: string }) => {
    const displayName = session.user.displayName || "";
    const firstName = input?.firstName || "";
    const lastName = input?.lastName || "";

    const doRequest = async (idToken: string) => {
      const res = await fetch("/api/auth/bootstrap-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: session.user.email,
          firstName,
          lastName,
          displayName,
        }),
      });
      const body = await res.json().catch(() => ({}));
      return { res, body };
    };

    let currentSession = session;
    let response = await doRequest(currentSession.idToken);

    if (response.res.status === 401) {
      const refreshed = await refreshIdToken(currentSession.refreshToken);
      currentSession = {
        ...currentSession,
        idToken: refreshed.idToken,
        refreshToken: refreshed.refreshToken,
        expiresIn: refreshed.expiresIn,
        user: {
          ...currentSession.user,
          uid: refreshed.uid || currentSession.user.uid,
        },
      };
      saveSession(currentSession);
      response = await doRequest(currentSession.idToken);
    }

    if (!response.res.ok) {
      throw new Error(response.body?.error || "Failed to bootstrap user profile");
    }

    return normalizeRole(response.body.profile || profileFromDisplayName(displayName) || { firstName, lastName });
  };

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const existing = readSession();
      if (!existing) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        let session = existing;
        if (existing.expiresAt <= Date.now() + 30_000) {
          const refreshed = await refreshIdToken(existing.refreshToken);
          session = {
            idToken: refreshed.idToken,
            refreshToken: refreshed.refreshToken,
            expiresIn: refreshed.expiresIn,
            user: {
              ...existing.user,
              uid: refreshed.uid,
            },
            expiresAt: Date.now() + refreshed.expiresIn * 1000,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
          syncAuthCookies(session as AuthSession);
        }

        session = ensureSessionUid(session as AuthSession) as typeof session;

        const fetchedProfile = await getUserProfile(session.idToken, session.user.uid);
        if (!mounted) return;

        setUser(session.user);
        setProfile(normalizeRole(fetchedProfile || profileFromDisplayName(session.user.displayName) || { firstName: "", lastName: "" }));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        syncAuthCookies(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signIn: async (email, password) => {
        let session = ensureSessionUid(await signInWithEmail(email, password));
        saveSession(session);
        session = ensureSessionUid(session as AuthSession) as typeof session;

        const bootstrapped = await bootstrapProfile(session);
        setUser(session.user);
        setProfile(bootstrapped);
      },
      signUp: async ({ firstName, lastName, email, password }) => {
        let session = ensureSessionUid(await signUpWithEmail(email, password));
        session = ensureSessionUid(await updateDisplayName(session.idToken, `${firstName} ${lastName}`.trim(), session.user.uid));

        saveSession(session);
        setUser(session.user);

        const bootstrapped = await bootstrapProfile(session, { firstName, lastName });
        setProfile(bootstrapped);
      },
      signInWithGoogleCredential: async (credential) => {
        let session = ensureSessionUid(await signInWithGoogleIdToken(credential));
        saveSession(session);
        session = ensureSessionUid(session as AuthSession) as typeof session;

        const bootstrapped = await bootstrapProfile(session);
        setUser(session.user);
        setProfile(bootstrapped);
      },
      signOut: () => {
        localStorage.removeItem(STORAGE_KEY);
        syncAuthCookies(null);
        setUser(null);
        setProfile(null);
      },
    }),
    [loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
