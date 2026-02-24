import { sendPasswordResetEmail as firebaseSendPasswordResetEmail } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { firestoreDeleteDocument, firestoreGetDocument, firestoreListCollection, firestorePatchDocument, firestoreSetDocument } from "@/lib/firestore-rest";

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

function splitName(fullName: string) {
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

function composeName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export async function sendPasswordResetEmail(email: string) {
  await firebaseSendPasswordResetEmail(auth, email);
}

export async function saveUserProfile(idToken: string, uid: string, profile: UserProfile) {
  const fullName = composeName(profile.firstName, profile.lastName);
  await firestoreSetDocument(idToken, `users/${uid}`, {
    name: fullName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: profile.role,
    email: profile.email,
    createdAt: profile.createdAt,
    lastLoginAt: profile.lastLoginAt,
    loginCount: profile.loginCount,
    totalPracticeSeconds: profile.totalPracticeSeconds,
  });
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
  const profileData = await firestoreGetDocument(idToken, `users/${uid}`);
  if (!profileData) return null;

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
  const docs = await firestoreListCollection(idToken, "users");
  return docs.map(({ id: uid, data: raw }) => {
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
  await firestorePatchDocument(idToken, `users/${uid}`, {
    name: trimmed,
    firstName: split.firstName,
    lastName: split.lastName,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteUserData(idToken: string, uid: string) {
  await firestoreDeleteDocument(idToken, `users/${uid}`);
}

export async function getUserRole(idToken: string, uid: string): Promise<UserRole> {
  const doc = await firestoreGetDocument(idToken, `users/${uid}`);
  return doc?.role === "admin" ? "admin" : "user";
}

export async function setUserRole(idToken: string, uid: string, role: UserRole) {
  await firestorePatchDocument(idToken, `users/${uid}`, { role });
}
