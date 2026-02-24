"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import { doc, increment, serverTimestamp, setDoc } from "firebase/firestore";

import { getUserProfile, type AuthSession, type AuthUser, type UserProfile, type UserRole } from "@/lib/firebase-auth-rest";

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

async function toSession(firebaseUser: User): Promise<AuthSession & { expiresAt: number }> {
  const tokenResult = await firebaseUser.getIdTokenResult();
  const expiresAt = Date.parse(tokenResult.expirationTime);
  const expiresIn = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));

  return {
    idToken: tokenResult.token,
    refreshToken: firebaseUser.refreshToken || "",
    expiresIn,
    expiresAt,
    user: {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || undefined,
    },
  };
}

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

function saveSession(session: AuthSession & { expiresAt?: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  syncAuthCookies(session);
}

async function bootstrapProfile(session: AuthSession, input?: { firstName?: string; lastName?: string }) {
  const displayName = session.user.displayName || "";
  const firstName = input?.firstName || "";
  const lastName = input?.lastName || "";

  const res = await fetch("/api/auth/bootstrap-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.idToken}`,
    },
    body: JSON.stringify({
      email: session.user.email,
      firstName,
      lastName,
      displayName,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || "Failed to bootstrap user profile");
  }

  return normalizeRole(body.profile || profileFromDisplayName(displayName) || { firstName, lastName });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        localStorage.removeItem(STORAGE_KEY);
        syncAuthCookies(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const session = await toSession(firebaseUser);
        saveSession(session);
        const fetchedProfile = await getUserProfile(session.idToken, session.user.uid);

        setUser(session.user);
        setProfile(normalizeRole(fetchedProfile || profileFromDisplayName(session.user.displayName) || { firstName: "", lastName: "" }));
      } catch {
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signIn: async (email, password) => {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          const session = await toSession(cred.user);
          saveSession(session);
          const bootstrapped = await bootstrapProfile(session);
          setUser(session.user);
          setProfile(bootstrapped);
        } catch (error: any) {
          console.log(error?.code);
          console.log(error?.message);
          throw error;
        }
      },
      signUp: async ({ firstName, lastName, email, password }) => {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: `${firstName} ${lastName}`.trim() });

          await setDoc(doc(db, "users", cred.user.uid), {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email,
            role: "user",
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            loginCount: increment(1),
            totalPracticeSeconds: 0,
          }, { merge: true });

          const session = await toSession(cred.user);
          saveSession(session);
          const bootstrapped = await bootstrapProfile(session, { firstName, lastName });
          setUser(session.user);
          setProfile(bootstrapped);
        } catch (error: any) {
          console.log(error?.code);
          console.log(error?.message);
          throw error;
        }
      },
      signInWithGoogleCredential: async (credential) => {
        try {
          const googleCredential = GoogleAuthProvider.credential(credential);
          const cred = await signInWithCredential(auth, googleCredential);
          const session = await toSession(cred.user);
          saveSession(session);
          const bootstrapped = await bootstrapProfile(session);
          setUser(session.user);
          setProfile(bootstrapped);
        } catch (error: any) {
          console.log(error?.code);
          console.log(error?.message);
          throw error;
        }
      },
      signOut: () => {
        void firebaseSignOut(auth);
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
