import { FIREBASE_DATABASE_URL } from "@/lib/firebase-config";

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

function getStoredAuth() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("studyrx_auth_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { user: { uid: string }; idToken: string };
  } catch {
    return null;
  }
}

function getUserPath(path: string) {
  const auth = getStoredAuth();
  if (!auth?.user?.uid || !auth?.idToken) {
    throw new Error("Not authenticated");
  }

  return {
    url: `${FIREBASE_DATABASE_URL}/users/${auth.user.uid}/${path}.json?auth=${encodeURIComponent(auth.idToken)}`,
    uid: auth.user.uid,
  };
}

async function dbGet<T>(path: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;
  try {
    const { url } = getUserPath(path);
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = await res.json();
    return (data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

async function dbSet(path: string, value: unknown) {
  if (typeof window === "undefined") return;
  const { url } = getUserPath(path);
  await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
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
    const raw = await dbGet<Record<string, Partial<SessionData>>>("sessions", {});
    return Object.values(raw || {}).map(normalizeSession);
  },

  saveSession: async (session: SessionData) => {
    const immutableSession = normalizeSession({ ...session, endTimestamp: session.endTimestamp ?? new Date().toISOString() });
    await dbSet(`sessions/${immutableSession.sessionId}`, immutableSession);
    await dbSet("currentSession", null);
  },

  setCurrentSession: async (session: SessionData) => {
    await dbSet("currentSession", normalizeSession(session));
  },

  getCurrentSession: async (): Promise<SessionData | null> => {
    const session = await dbGet<Partial<SessionData> | null>("currentSession", null);
    return session ? normalizeSession(session) : null;
  },

  clearCurrentSession: async () => {
    await dbSet("currentSession", null);
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
    return dbGet<number[]>(`wrongQuestions/${eventId}`, []);
  },

  addWrongQuestion: async (eventId: string, questionId: number) => {
    const wrong = await storage.getWrongQuestions(eventId);
    if (!wrong.includes(questionId)) {
      wrong.push(questionId);
      await dbSet(`wrongQuestions/${eventId}`, wrong);
    }
  },

  removeWrongQuestion: async (eventId: string, questionId: number) => {
    const wrong = await storage.getWrongQuestions(eventId);
    await dbSet(`wrongQuestions/${eventId}`, wrong.filter((id) => id !== questionId));
  },

  getCompletedQuestions: async (eventId: string): Promise<number[]> => {
    return dbGet<number[]>(`completedQuestions/${eventId}`, []);
  },

  addCompletedQuestion: async (eventId: string, questionId: number) => {
    const completed = await storage.getCompletedQuestions(eventId);
    if (!completed.includes(questionId)) {
      completed.push(questionId);
      await dbSet(`completedQuestions/${eventId}`, completed);
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
    await dbSet("sessions", {});
    await dbSet("currentSession", null);
    await dbSet("wrongQuestions", {});
    await dbSet("completedQuestions", {});
  },
};
