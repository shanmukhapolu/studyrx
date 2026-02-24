import { firestoreDeleteDocument, firestoreGetDocument, firestoreListCollection, firestorePatchDocument, firestoreSetDocument } from "@/lib/firestore-rest";

export interface Question {
  id: number;
  sourceId?: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  correctAnswer?: string; // legacy compatibility for old records
  category: string;
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

async function getStoredAuth(): Promise<StoredAuthSession | null> {
  const session = readStoredAuth();
  if (!session) return null;

  if ((!session.user?.uid || session.user.uid.length === 0) && session.idToken) {
    const decodedUid = resolveUidFromToken(session.idToken);
    if (decodedUid) {
      const next = {
        ...session,
        user: {
          ...session.user,
          uid: decodedUid,
        },
      };
      localStorage.setItem("studyrx_auth_session", JSON.stringify(next));
      return next;
    }
  }

  return session;
}

async function getUserAuth() {

  const auth = await getStoredAuth();
  if (!auth?.user?.uid || !auth?.idToken) {
    throw new Error("Not authenticated");
  }

  return {
    uid: auth.user.uid,
    idToken: auth.idToken,
  };
}

function parsePath(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts;
}

async function dbGet<T>(path: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;

  const read = async (idToken: string, uid: string): Promise<T> => {
    const parts = parsePath(path);

    if (parts.length === 1 && parts[0] === "events") {
      const events = await firestoreListCollection(idToken, `users/${uid}/events`);
      const mapped: Record<string, any> = {};
      for (const event of events) {
        const eventId = event.id;
        const eventData = event.data || {};
        const sessions = await firestoreListCollection(idToken, `users/${uid}/events/${eventId}/sessions`);
        mapped[eventId] = {
          ...eventData,
          sessions: Object.fromEntries(sessions.map((session) => [session.id, session.data])),
        };
      }
      return mapped as T;
    }

    if (parts.length === 2 && parts[0] === "events") {
      const eventDoc = await firestoreGetDocument(idToken, `users/${uid}/events/${parts[1]}`);
      return ((eventDoc || null) as T) ?? fallback;
    }

    if (parts.length === 3 && parts[0] === "events") {
      const eventDoc = await firestoreGetDocument(idToken, `users/${uid}/events/${parts[1]}`);
      return (((eventDoc || {})[parts[2]] ?? fallback) as T);
    }

    if (parts.length === 1 && (parts[0] === "currentSession" || parts[0] === "totalPracticeSeconds")) {
      const userDoc = await firestoreGetDocument(idToken, `users/${uid}`);
      return (((userDoc || {})[parts[0]] ?? fallback) as T);
    }

    return fallback;
  };

  try {
    const primary = await getUserAuth();
    return await read(primary.idToken, primary.uid);
  } catch {
    try {
      const retry = await getUserAuth();
      return await read(retry.idToken, retry.uid);
    } catch {
      return fallback;
    }
  }
}

async function dbSet(path: string, value: unknown) {
  if (typeof window === "undefined") return;

  const write = async (idToken: string, uid: string) => {
    const parts = parsePath(path);

    if (parts[0] === "events" && parts.length === 4 && parts[2] === "sessions") {
      const [_, eventId, __, sessionId] = parts;
      await firestoreSetDocument(idToken, `users/${uid}/events/${eventId}/sessions/${sessionId}`, value as Record<string, any>);
      return;
    }

    if (parts[0] === "events" && parts.length === 3) {
      const [_, eventId, field] = parts;
      await firestorePatchDocument(idToken, `users/${uid}/events/${eventId}`, { [field]: value as any });
      return;
    }

    if (parts[0] === "currentSession") {
      await firestorePatchDocument(idToken, `users/${uid}`, { currentSession: value as any });
      return;
    }

    if (parts[0] === "totalPracticeSeconds") {
      await firestorePatchDocument(idToken, `users/${uid}`, { totalPracticeSeconds: Number(value || 0) });
      return;
    }

    throw new Error(`Unsupported write path: ${path}`);
  };

  try {
    const primary = await getUserAuth();
    await write(primary.idToken, primary.uid);
  } catch {
    const retry = await getUserAuth();
    await write(retry.idToken, retry.uid);
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
      const currentPracticeSeconds = await dbGet<number>("totalPracticeSeconds", 0);
      const increment = Math.round((immutableSession.totalThinkTime + immutableSession.totalExplanationTime) || 0);
      await dbSet("totalPracticeSeconds", Math.max(0, currentPracticeSeconds + increment));
    } catch {
      // Best effort profile metric.
    }

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
