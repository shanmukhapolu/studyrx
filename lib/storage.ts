import { FIREBASE_DATABASE_URL } from "@/lib/firebase-config";
import { refreshIdToken } from "@/lib/firebase-auth-rest";

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  category: "Cell Biology & Genetics" | "Human Physiology" | "Human Disease";
  difficulty: "Easy" | "Medium" | "Hard";
  explanation: string;
  tag?: string;
}

export type SessionType = "practice" | "timed";

export interface QuestionAttempt {
  questionId: number;
  questionIndex: number;
  category: string;
  difficulty: string;
  isCorrect: boolean;
  thinkTime: number;
  explanationTime: number;
  timestampStart: string;
  timestampSubmit: string;
  isRedemption?: boolean;
  eventId: string;
  // legacy compatibility fields
  correct?: boolean;
  timeSpent?: number;
  timestamp?: string;
}

export interface SessionData {
  sessionId: string;
  sessionType: SessionType;
  event: string;
  startTimestamp: string;
  endTimestamp?: string;
  totalThinkTime: number;
  totalExplanationTime: number;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  attempts: QuestionAttempt[];
  // legacy compatibility fields
  startTime?: string;
  endTime?: string;
  eventId?: string;
}

export interface UserStats {
  totalAttempts: number;
  correctAnswers: number;
  averageTime: number;
  categoryStats: {
    [category: string]: {
      attempts: number;
      correct: number;
      averageTime: number;
    };
  };
}

function createDeterministicSessionId() {
  const now = Date.now();
  const seed = Math.random().toString(36).slice(2, 8);
  return `session_${now}_${seed}`;
}

type StoredAuthSession = {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt?: number;
  user: {
    uid: string;
    email?: string;
    displayName?: string;
  };
};

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

function readStoredAuth(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("studyrx_auth_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

function resolveUidFromToken(idToken: string): string {
  const payload = decodeJwtPayload(idToken);
  const uid = (payload?.user_id || payload?.sub) as string | undefined;
  return typeof uid === "string" ? uid : "";
}

async function getStoredAuth(options?: { forceRefresh?: boolean }): Promise<StoredAuthSession | null> {
  const session = readStoredAuth();
  if (!session) return null;

  let current = session;

  if ((!current.user?.uid || current.user.uid.length === 0) && current.idToken) {
    const decodedUid = resolveUidFromToken(current.idToken);
    if (decodedUid) {
      current = {
        ...current,
        user: {
          ...current.user,
          uid: decodedUid,
        },
      };
      localStorage.setItem("studyrx_auth_session", JSON.stringify(current));
    }
  }

  const expiresAt = current.expiresAt ?? 0;
  const missingUid = !current.user?.uid || current.user.uid.length === 0;
  const shouldRefresh = Boolean(current.refreshToken) && (missingUid || options?.forceRefresh || (expiresAt > 0 && expiresAt <= Date.now() + 30_000));
  if (shouldRefresh) {
    try {
      const refreshed = await refreshIdToken(current.refreshToken);
      current = {
        ...current,
        idToken: refreshed.idToken,
        refreshToken: refreshed.refreshToken,
        expiresIn: refreshed.expiresIn,
        expiresAt: Date.now() + refreshed.expiresIn * 1000,
        user: {
          ...current.user,
          uid: refreshed.uid || current.user.uid || resolveUidFromToken(refreshed.idToken),
        },
      };
      localStorage.setItem("studyrx_auth_session", JSON.stringify(current));
    } catch {
      return current;
    }
  }

  return current;
}

async function getUserPath(path: string, options?: { forceRefresh?: boolean }) {
  const auth = await getStoredAuth(options);
  if (!auth?.user?.uid || !auth?.idToken) {
    throw new Error("Not authenticated");
  }

  return {
    url: `${FIREBASE_DATABASE_URL}/users/${auth.user.uid}/${path}.json?auth=${encodeURIComponent(auth.idToken)}`,
    uid: auth.user.uid,
    idToken: auth.idToken,
  };
}

async function dbGet<T>(path: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;
  try {
    const primary = await getUserPath(path);
    let res = await fetch(primary.url, {
      headers: {
        Authorization: `Bearer ${primary.idToken}`,
      },
    });

    if ((res.status === 401 || res.status === 403)) {
      const retry = await getUserPath(path, { forceRefresh: true });
      res = await fetch(retry.url, {
        headers: {
          Authorization: `Bearer ${retry.idToken}`,
        },
      });
    }

    if (!res.ok) return fallback;
    const data = await res.json();
    return (data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

async function dbSet(path: string, value: unknown) {
  if (typeof window === "undefined") return;
  let request = await getUserPath(path);
  let res = await fetch(request.url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.idToken}`,
    },
    body: JSON.stringify(value),
  });

  if (res.status === 401 || res.status === 403) {
    request = await getUserPath(path, { forceRefresh: true });
    res = await fetch(request.url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.idToken}`,
      },
      body: JSON.stringify(value),
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to write ${path}: ${res.status} ${text}`);
  }
}

type EventRecord = {
  sessions?: Record<string, Partial<SessionData>>;
  wrongQuestions?: number[];
  completedQuestions?: number[];
};

type PersistedSessionRecord = Omit<SessionData, "attempts"> & {
  attempts: string;
};


function normalizeEventSessions(events: Record<string, EventRecord> | null | undefined): SessionData[] {
  if (!events) return [];

  return Object.entries(events).flatMap(([eventId, eventData]) => {
    const sessions = eventData?.sessions ?? {};
    return Object.values(sessions).map((rawSession) => {
      const sessionWithAttempts = { ...rawSession } as Partial<SessionData> & { attempts?: string | QuestionAttempt[] };
      let parsedAttempts: QuestionAttempt[] = [];

      if (typeof sessionWithAttempts.attempts === "string") {
        try {
          const parsed = JSON.parse(sessionWithAttempts.attempts);
          if (Array.isArray(parsed)) {
            parsedAttempts = parsed as QuestionAttempt[];
          }
        } catch {
          parsedAttempts = [];
        }
      } else if (Array.isArray(sessionWithAttempts.attempts)) {
        parsedAttempts = sessionWithAttempts.attempts;
      }

      return normalizeSession({
        ...sessionWithAttempts,
        event: sessionWithAttempts.event ?? eventId,
        attempts: parsedAttempts,
      });
    });
  });
}

function normalizeAttempt(attempt: Partial<QuestionAttempt>, index: number, eventFallback = "unknown"): QuestionAttempt {
  const isCorrect = attempt.isCorrect ?? attempt.correct ?? false;
  const thinkTime = attempt.thinkTime ?? attempt.timeSpent ?? 0;

  return {
    questionId: attempt.questionId ?? -1,
    questionIndex: attempt.questionIndex ?? index + 1,
    category: attempt.category ?? "Unknown",
    difficulty: attempt.difficulty ?? "Unknown",
    isCorrect,
    thinkTime,
    explanationTime: attempt.explanationTime ?? 0,
    timestampStart: attempt.timestampStart ?? attempt.timestamp ?? new Date().toISOString(),
    timestampSubmit: attempt.timestampSubmit ?? attempt.timestamp ?? new Date().toISOString(),
    isRedemption: attempt.isRedemption,
    eventId: attempt.eventId ?? eventFallback,
    correct: isCorrect,
    timeSpent: thinkTime,
    timestamp: attempt.timestampSubmit ?? attempt.timestamp,
  };
}

function normalizeSession(session: Partial<SessionData>): SessionData {
  const event = session.event ?? session.eventId ?? "unknown";
  const attempts = (session.attempts ?? []).map((attempt, index) => normalizeAttempt(attempt, index, event));
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const totalThinkTime = attempts.reduce((sum, a) => sum + a.thinkTime, 0);
  const totalExplanationTime = attempts.reduce((sum, a) => sum + a.explanationTime, 0);
  const totalQuestions = attempts.length;

  return {
    sessionId: session.sessionId ?? createDeterministicSessionId(),
    sessionType: session.sessionType ?? "practice",
    event,
    startTimestamp: session.startTimestamp ?? session.startTime ?? new Date().toISOString(),
    endTimestamp: session.endTimestamp ?? session.endTime,
    totalThinkTime: session.totalThinkTime ?? totalThinkTime,
    totalExplanationTime: session.totalExplanationTime ?? totalExplanationTime,
    totalQuestions: session.totalQuestions ?? totalQuestions,
    correctCount: session.correctCount ?? correctCount,
    accuracy: session.accuracy ?? (totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0),
    attempts,
    startTime: session.startTimestamp ?? session.startTime,
    endTime: session.endTimestamp ?? session.endTime,
    eventId: event,
  };
}

export const storage = {
  createSession: (event: string, sessionType: SessionType = "practice"): SessionData => ({
    sessionId: createDeterministicSessionId(),
    sessionType,
    event,
    startTimestamp: new Date().toISOString(),
    totalThinkTime: 0,
    totalExplanationTime: 0,
    totalQuestions: 0,
    correctCount: 0,
    accuracy: 0,
    attempts: [],
    eventId: event,
  }),

  getAllSessions: async (): Promise<SessionData[]> => {
    const events = await dbGet<Record<string, EventRecord>>("events", {});
    return normalizeEventSessions(events);
  },

  saveSession: async (session: SessionData) => {
    const immutableSession = normalizeSession({ ...session, endTimestamp: session.endTimestamp ?? new Date().toISOString() });

    const persistedSession: PersistedSessionRecord = {
      ...immutableSession,
      attempts: JSON.stringify(immutableSession.attempts),
    };

    await dbSet(`events/${immutableSession.event}/sessions/${immutableSession.sessionId}`, persistedSession);

    try {
      await dbSet("currentSession", null);
    } catch {
      // Optional runtime key might be blocked by stricter DB rules; completed session is already persisted.
    }
  },

  setCurrentSession: async (session: SessionData) => {
    try {
      await dbSet("currentSession", normalizeSession(session));
    } catch {
      // Optional runtime key might be blocked by stricter DB rules.
    }
  },

  getCurrentSession: async (): Promise<SessionData | null> => {
    const session = await dbGet<Partial<SessionData> | null>("currentSession", null);
    return session ? normalizeSession(session) : null;
  },

  clearCurrentSession: async () => {
    try {
      await dbSet("currentSession", null);
    } catch {
      // Optional runtime key might be blocked by stricter DB rules.
    }
  },

  calculateStats: async (): Promise<UserStats> => {
    const sessions = await storage.getAllSessions();
    const allAttempts = sessions.flatMap((s) => s.attempts);

    const categoryStats: UserStats["categoryStats"] = {};
    for (const attempt of allAttempts) {
      if (!categoryStats[attempt.category]) {
        categoryStats[attempt.category] = { attempts: 0, correct: 0, averageTime: 0 };
      }
      categoryStats[attempt.category].attempts++;
      if (attempt.isCorrect) categoryStats[attempt.category].correct++;
    }

    for (const category of Object.keys(categoryStats)) {
      const categoryAttempts = allAttempts.filter((a) => a.category === category);
      const totalTime = categoryAttempts.reduce((sum, a) => sum + a.thinkTime, 0);
      categoryStats[category].averageTime = categoryAttempts.length > 0 ? totalTime / categoryAttempts.length : 0;
    }

    const totalCorrect = allAttempts.filter((a) => a.isCorrect).length;
    const totalTime = allAttempts.reduce((sum, a) => sum + a.thinkTime, 0);

    return {
      totalAttempts: allAttempts.length,
      correctAnswers: totalCorrect,
      averageTime: allAttempts.length > 0 ? totalTime / allAttempts.length : 0,
      categoryStats,
    };
  },

  getWrongQuestions: async (eventId: string): Promise<number[]> => {
    const eventData = await dbGet<EventRecord | null>(`events/${eventId}`, null);
    return eventData?.wrongQuestions ?? [];
  },

  addWrongQuestion: async (eventId: string, questionId: number) => {
    try {
      const wrong = await storage.getWrongQuestions(eventId);
      if (!wrong.includes(questionId)) {
        wrong.push(questionId);
        await dbSet(`events/${eventId}/wrongQuestions`, wrong);
      }
    } catch (error) {
      console.warn("Unable to persist wrong question", error);
    }
  },

  removeWrongQuestion: async (eventId: string, questionId: number) => {
    try {
      const wrong = await storage.getWrongQuestions(eventId);
      await dbSet(`events/${eventId}/wrongQuestions`, wrong.filter((id) => id !== questionId));
    } catch (error) {
      console.warn("Unable to remove wrong question", error);
    }
  },

  getCompletedQuestions: async (eventId: string): Promise<number[]> => {
    const eventData = await dbGet<EventRecord | null>(`events/${eventId}`, null);
    return eventData?.completedQuestions ?? [];
  },

  addCompletedQuestion: async (eventId: string, questionId: number) => {
    try {
      const completed = await storage.getCompletedQuestions(eventId);
      if (!completed.includes(questionId)) {
        completed.push(questionId);
        await dbSet(`events/${eventId}/completedQuestions`, completed);
      }
    } catch (error) {
      console.warn("Unable to persist completed question", error);
    }
  },

  getPracticedEvents: async (): Promise<string[]> => {
    const sessions = await storage.getAllSessions();
    return Array.from(new Set(sessions.map((session) => session.event)));
  },

  calculateEventStats: async (eventId: string): Promise<UserStats> => {
    const sessions = await storage.getAllSessions();
    const eventAttempts = sessions.flatMap((s) => s.attempts).filter((a) => a.eventId === eventId);

    const categoryStats: UserStats["categoryStats"] = {};
    for (const attempt of eventAttempts) {
      if (!categoryStats[attempt.category]) {
        categoryStats[attempt.category] = { attempts: 0, correct: 0, averageTime: 0 };
      }
      categoryStats[attempt.category].attempts++;
      if (attempt.isCorrect) categoryStats[attempt.category].correct++;
    }

    for (const category of Object.keys(categoryStats)) {
      const categoryAttempts = eventAttempts.filter((a) => a.category === category);
      const totalTime = categoryAttempts.reduce((sum, a) => sum + a.thinkTime, 0);
      categoryStats[category].averageTime = categoryAttempts.length > 0 ? totalTime / categoryAttempts.length : 0;
    }

    const totalCorrect = eventAttempts.filter((a) => a.isCorrect).length;
    const totalTime = eventAttempts.reduce((sum, a) => sum + a.thinkTime, 0);

    return {
      totalAttempts: eventAttempts.length,
      correctAnswers: totalCorrect,
      averageTime: eventAttempts.length > 0 ? totalTime / eventAttempts.length : 0,
      categoryStats,
    };
  },

  resetAllData: async () => {
    await dbSet("events", {});
    try {
      await dbSet("currentSession", null);
    } catch {
      // Optional runtime key might be blocked by stricter DB rules.
    }
  },
};
