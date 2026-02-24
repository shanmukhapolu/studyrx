import { FIREBASE_API_KEY, FIREBASE_DATABASE_URL } from "@/lib/firebase-config";
import { HOSA_EVENTS } from "@/lib/events";
import { refreshIdToken } from "@/lib/firebase-auth-rest";
import type { Question, SessionData } from "@/lib/storage";

export type AdminQuestion = Question & {
  eventId: string;
  averageAccuracy: number;
  attempts: number;
};

export type ManagedUser = {
  uid: string;
  name: string;
  email: string;
  createdAt: string;
  loginCount: number;
  lastLoginAt: string;
  totalPracticeSeconds: number;
};

type StoredAuthSession = {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt?: number;
  user: { uid: string; email?: string };
};

type QuestionRecord = Omit<Question, "id"> & { id?: string; eventId: string };

type UserNode = {
  name?: string;
  profile?: { email?: string; createdAt?: string };
  authStats?: { loginCount?: number; lastLoginAt?: string };
  events?: Record<string, { sessions?: Record<string, Partial<SessionData>> }>;
};

function getStoredSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("studyrx_auth_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

async function getValidSession(): Promise<StoredAuthSession> {
  const session = getStoredSession();
  if (!session) throw new Error("Not authenticated");
  if (session.expiresAt && session.expiresAt <= Date.now() + 30_000) {
    const refreshed = await refreshIdToken(session.refreshToken);
    const next = {
      ...session,
      idToken: refreshed.idToken,
      refreshToken: refreshed.refreshToken,
      expiresIn: refreshed.expiresIn,
      expiresAt: Date.now() + refreshed.expiresIn * 1000,
      user: {
        ...session.user,
        uid: refreshed.uid || session.user.uid,
      },
    };
    localStorage.setItem("studyrx_auth_session", JSON.stringify(next));
    return next;
  }
  return session;
}

async function adminFetch(path: string, init?: RequestInit) {
  const session = await getValidSession();
  const res = await fetch(`${FIREBASE_DATABASE_URL}/${path}.json?auth=${encodeURIComponent(session.idToken)}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }
  return res;
}

export async function getIsAdmin(uid: string): Promise<boolean> {
  const res = await adminFetch(`admins/${uid}`);
  const data = await res.json();
  return data === true;
}

export async function touchUserProfileOnSignIn(uid: string, email: string) {
  const now = new Date().toISOString();
  const statsRes = await adminFetch(`users/${uid}/authStats`);
  const stats = (await statsRes.json()) as { loginCount?: number } | null;
  await adminFetch(`users/${uid}/profile`, {
    method: "PATCH",
    body: JSON.stringify({
      email,
      lastSeenAt: now,
      createdAt: now,
    }),
  });

  await adminFetch(`users/${uid}/authStats`, {
    method: "PATCH",
    body: JSON.stringify({
      loginCount: Number(stats?.loginCount || 0) + 1,
      lastLoginAt: now,
    }),
  });
}

export async function resetUserPassword(email: string) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || "Failed to send reset email");
  }
}

export async function getAllUsers(): Promise<ManagedUser[]> {
  const res = await adminFetch("users");
  const data = (await res.json()) as Record<string, UserNode> | null;
  if (!data) return [];

  return Object.entries(data).map(([uid, user]) => {
    const name = user.name || "Unknown";
    const totalPracticeSeconds = Object.values(user.events || {}).flatMap((event) => Object.values(event.sessions || {})).reduce((sum, session) => sum + Number(session.totalThinkTime || 0), 0);
    return {
      uid,
      name,
      email: user.profile?.email || "",
      createdAt: user.profile?.createdAt || "",
      loginCount: Number(user.authStats?.loginCount || 0),
      lastLoginAt: user.authStats?.lastLoginAt || "",
      totalPracticeSeconds,
    };
  });
}

export async function updateUserName(uid: string, name: string) {
  await adminFetch(`users/${uid}/name`, { method: "PUT", body: JSON.stringify(name) });
}

export async function deleteUser(uid: string) {
  await adminFetch(`users/${uid}`, { method: "DELETE" });
}

export async function getAllQuestions(): Promise<AdminQuestion[]> {
  const res = await adminFetch("questions");
  const raw = (await res.json()) as Record<string, QuestionRecord> | null;
  const list = Object.entries(raw || {}).map(([id, q]) => ({ ...q, id: q.id || id }));

  const attemptsRes = await adminFetch("users");
  const users = (await attemptsRes.json()) as Record<string, UserNode> | null;
  const attemptMap = new Map<string, { total: number; correct: number }>();

  Object.values(users || {}).forEach((user) => {
    Object.entries(user.events || {}).forEach(([eventId, eventData]) => {
      Object.values(eventData.sessions || {}).forEach((session) => {
        const attemptsRaw = session.attempts;
        let attempts: Array<{ questionId: string; isCorrect: boolean }> = [];
        if (typeof attemptsRaw === "string") {
          try {
            attempts = JSON.parse(attemptsRaw);
          } catch {
            attempts = [];
          }
        } else if (Array.isArray(attemptsRaw)) {
          attempts = attemptsRaw as Array<{ questionId: string; isCorrect: boolean }>;
        }

        attempts.forEach((attempt) => {
          const normalizedId = String(attempt.questionId);
          const key = normalizedId.includes("::") ? normalizedId : `${eventId}::${normalizedId}`;
          const current = attemptMap.get(key) || { total: 0, correct: 0 };
          current.total += 1;
          if (attempt.isCorrect) current.correct += 1;
          attemptMap.set(key, current);
        });
      });
    });
  });

  return list.map((question) => {
    const metrics = attemptMap.get(question.id) || { total: 0, correct: 0 };
    return {
      ...(question as QuestionRecord),
      id: question.id,
      averageAccuracy: metrics.total ? (metrics.correct / metrics.total) * 100 : 0,
      attempts: metrics.total,
    } as AdminQuestion;
  });
}

export async function saveQuestion(question: Omit<AdminQuestion, "averageAccuracy" | "attempts">) {
  await adminFetch(`questions/${question.id}`, {
    method: "PUT",
    body: JSON.stringify(question),
  });
}

export async function deleteQuestion(questionId: string) {
  await adminFetch(`questions/${questionId}`, { method: "DELETE" });
}

export async function getQuestionsForEvent(eventId: string): Promise<Question[]> {
  const res = await adminFetch("questions");
  const raw = (await res.json()) as Record<string, QuestionRecord> | null;
  const managed = Object.entries(raw || {})
    .map(([id, q]) => ({ ...q, id: q.id || id }))
    .filter((q) => q.eventId === eventId)
    .map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      category: q.category,
      difficulty: q.difficulty,
      explanation: q.explanation,
      tag: q.tag,
    }));

  if (managed.length > 0) return managed;

  const event = HOSA_EVENTS.find((item) => item.id === eventId);
  if (!event) return [];
  const fallback = await fetch(event.questionBankFile);
  const fallbackQuestions = (await fallback.json()) as Array<Omit<Question, "id"> & { id: number | string }>;

  return fallbackQuestions.map((question) => ({
    ...question,
    id: `${eventId}::${question.id}`,
  }));
}
