"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  getUserRecord,
  getUserProfile,
  isAdmin,
  refreshIdToken,
  saveUserProfile,
  sendPasswordResetEmail,
  signInWithEmail,
  signUpWithEmail,
  type UserRole,
  upsertUserRecord,
  updateDisplayName,
  type AuthSession,
  type AuthUser,
  type UserProfile,
} from "@/lib/firebase-auth-rest";
import { signInWithGooglePopup } from "@/lib/firebase-web";

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateName: (input: { firstName: string; lastName: string }) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  signOut: () => void;
}

const STORAGE_KEY = "studyrx_auth_session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  };
}

async function getFreshSession() {
  const existing = readSession();
  if (!existing) {
    throw new Error("Not authenticated");
  }

  let session = ensureSessionUid(existing as AuthSession) as AuthSession & { expiresAt?: number };
  if ((session.expiresAt ?? 0) <= Date.now() + 30_000) {
    const refreshed = await refreshIdToken(session.refreshToken);
    session = ensureSessionUid({
      ...session,
      idToken: refreshed.idToken,
      refreshToken: refreshed.refreshToken,
      expiresIn: refreshed.expiresIn,
      expiresAt: Date.now() + refreshed.expiresIn * 1000,
      user: {
        ...session.user,
        uid: refreshed.uid || session.user.uid,
      },
    } as AuthSession & { expiresAt?: number });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>("user");
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
        }

        session = ensureSessionUid(session as AuthSession) as typeof session;

        const userRecord = await getUserRecord(session.idToken, session.user.uid);
        const fetchedProfile = await getUserProfile(session.idToken, session.user.uid);
        if (!mounted) return;

        setUser(session.user);
        setProfile(fetchedProfile || profileFromDisplayName(session.user.displayName));
        setRole(userRecord?.role === "admin" ? "admin" : "user");
      } catch {
        localStorage.removeItem(STORAGE_KEY);
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
      role,
      isAdmin: isAdmin({ role }),
      loading,
      signIn: async (email, password) => {
        let session = ensureSessionUid(await signInWithEmail(email, password));
        saveSession(session);
        session = ensureSessionUid(session as AuthSession) as typeof session;

        const existingRecord = await getUserRecord(session.idToken, session.user.uid);
        const now = new Date().toISOString();
        await upsertUserRecord(session.idToken, session.user.uid, {
          name: existingRecord?.name || session.user.displayName || "",
          email: existingRecord?.email || session.user.email || email,
          role: existingRecord?.role || "user",
          createdAt: existingRecord?.createdAt || now,
          lastLogin: now,
        });

        const fetchedProfile = await getUserProfile(session.idToken, session.user.uid);
        setUser(session.user);
        setProfile(fetchedProfile || profileFromDisplayName(session.user.displayName));
        setRole(existingRecord?.role === "admin" ? "admin" : "user");
      },
      signUp: async ({ firstName, lastName, email, password }) => {
        let session = ensureSessionUid(await signUpWithEmail(email, password));
        session = ensureSessionUid(await updateDisplayName(session.idToken, `${firstName} ${lastName}`.trim(), session.user.uid));

        try {
          await saveUserProfile(session.idToken, session.user.uid, { firstName, lastName });
        } catch (error) {
          console.warn("Profile write skipped during signup; attempting fresh sign-in token.", error);
          try {
            session = ensureSessionUid(await signInWithEmail(email, password));
            await saveUserProfile(session.idToken, session.user.uid, { firstName, lastName });
          } catch (recoveryError) {
            console.warn("Signup recovery profile write also failed; continuing with Auth displayName fallback.", recoveryError);
          }
        }

        saveSession(session);
        const now = new Date().toISOString();
        await upsertUserRecord(session.idToken, session.user.uid, {
          name: `${firstName} ${lastName}`.trim(),
          email,
          role: "user",
          createdAt: now,
          lastLogin: now,
        });
        setUser(session.user);
        setProfile({ firstName, lastName });
        setRole("user");
      },
      signInWithGoogle: async () => {
        let session = ensureSessionUid(await signInWithGooglePopup());
        const parsedProfile = profileFromDisplayName(session.user.displayName) || { firstName: "", lastName: "" };

        if (parsedProfile.firstName || parsedProfile.lastName) {
          try {
            await saveUserProfile(session.idToken, session.user.uid, parsedProfile);
          } catch (error) {
            console.warn("Profile write skipped during Google sign-in; continuing with Auth displayName fallback.", error);
          }
        }

        saveSession(session);
        session = ensureSessionUid(session as AuthSession) as typeof session;

        const existingRecord = await getUserRecord(session.idToken, session.user.uid);
        const now = new Date().toISOString();
        await upsertUserRecord(session.idToken, session.user.uid, {
          name: existingRecord?.name || `${parsedProfile.firstName} ${parsedProfile.lastName}`.trim() || session.user.displayName || "",
          email: existingRecord?.email || session.user.email || "",
          role: existingRecord?.role || "user",
          createdAt: existingRecord?.createdAt || now,
          lastLogin: now,
        });

        const fetchedProfile = await getUserProfile(session.idToken, session.user.uid);
        setUser(session.user);
        setProfile(fetchedProfile || parsedProfile);
        setRole(existingRecord?.role === "admin" ? "admin" : "user");
      },
      updateName: async ({ firstName, lastName }) => {
        const currentSession = await getFreshSession();
        const displayName = `${firstName} ${lastName}`.trim();
        const updatedSession = ensureSessionUid(await updateDisplayName(currentSession.idToken, displayName, currentSession.user.uid));
        await saveUserProfile(updatedSession.idToken || currentSession.idToken, currentSession.user.uid, { firstName, lastName });

        const existing = readSession();
        if (existing) {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              ...existing,
              user: {
                ...existing.user,
                displayName,
              },
            })
          );
        }

        setUser({
          ...currentSession.user,
          displayName,
        });
        setProfile({ firstName, lastName });
        await upsertUserRecord(currentSession.idToken, currentSession.user.uid, {
          name: displayName,
        });
      },
      sendPasswordReset: async () => {
        const existing = readSession();
        const email = existing?.user?.email || user?.email;
        if (!email) {
          throw new Error("No email address found for this account.");
        }
        await sendPasswordResetEmail(email);
      },
      signOut: () => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        setProfile(null);
        setRole("user");
      },
    }),
    [loading, role, user]
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
