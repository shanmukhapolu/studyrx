import { getEventName } from "./events";

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
  eventId?: string;
}

export interface SessionData {
  sessionId: string;
  sessionType: SessionType;
  eventId?: string;
  eventName: string;
  startTimestamp: string;
  endTimestamp?: string;
  totalThinkTime: number;
  totalExplanationTime: number;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  attempts: QuestionAttempt[];
}

export interface UserStats {
  totalAttempts: number;
  correctAnswers: number;
  averageThinkTime: number;
  averageExplanationTime: number;
  categoryStats: {
    [category: string]: {
      attempts: number;
      correct: number;
      averageThinkTime: number;
      averageExplanationTime: number;
    };
  };
}

const STORAGE_KEYS = {
  SESSIONS: "studyrx_sessions",
  CURRENT_SESSION: "studyrx_current_session",
  WRONG_QUESTIONS: "studyrx_wrong_questions",
  COMPLETED_QUESTIONS: "studyrx_completed_questions",
} as const;

const normalizeNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && !Number.isNaN(value) ? value : fallback;

const normalizeAttempt = (raw: any, index: number): QuestionAttempt => {
  const timestampStart =
    raw.timestampStart || raw.timestamp || raw.startTime || new Date().toISOString();
  const timestampSubmit = raw.timestampSubmit || raw.timestamp || raw.endTime || timestampStart;

  return {
    questionId: normalizeNumber(raw.questionId ?? raw.id),
    questionIndex: normalizeNumber(raw.questionIndex, index + 1),
    category: raw.category ?? "Unknown",
    difficulty: raw.difficulty ?? "Unknown",
    isCorrect: raw.isCorrect ?? raw.correct ?? false,
    thinkTime: normalizeNumber(raw.thinkTime ?? raw.timeSpent),
    explanationTime: normalizeNumber(raw.explanationTime),
    timestampStart,
    timestampSubmit,
    isRedemption: raw.isRedemption,
    eventId: raw.eventId,
  };
};

const calculateSessionTotals = (attempts: QuestionAttempt[]) => {
  const totalThinkTime = attempts.reduce((sum, attempt) => sum + attempt.thinkTime, 0);
  const totalExplanationTime = attempts.reduce(
    (sum, attempt) => sum + attempt.explanationTime,
    0
  );
  const totalQuestions = attempts.length;
  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  return {
    totalThinkTime,
    totalExplanationTime,
    totalQuestions,
    correctCount,
    accuracy,
  };
};

const normalizeSession = (raw: any): SessionData => {
  const attempts = Array.isArray(raw.attempts)
    ? raw.attempts.map((attempt: any, index: number) => normalizeAttempt(attempt, index))
    : [];
  const totals = calculateSessionTotals(attempts);
  const eventId = raw.eventId || raw.event || attempts[0]?.eventId || "unknown";

  return {
    sessionId: raw.sessionId || `session_${raw.startTimestamp || raw.startTime || Date.now()}`,
    sessionType: raw.sessionType || "practice",
    eventId,
    eventName: raw.eventName || getEventName(eventId),
    startTimestamp: raw.startTimestamp || raw.startTime || new Date().toISOString(),
    endTimestamp: raw.endTimestamp || raw.endTime,
    totalThinkTime: normalizeNumber(raw.totalThinkTime, totals.totalThinkTime),
    totalExplanationTime: normalizeNumber(raw.totalExplanationTime, totals.totalExplanationTime),
    totalQuestions: normalizeNumber(raw.totalQuestions, totals.totalQuestions),
    correctCount: normalizeNumber(raw.correctCount, totals.correctCount),
    accuracy: normalizeNumber(raw.accuracy, totals.accuracy),
    attempts,
  };
};

export const storage = {
  // Sessions
  getAllSessions: (): SessionData[] => {
    if (typeof window !== "undefined") {
      const sessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const parsed = sessions ? JSON.parse(sessions) : [];
      return Array.isArray(parsed) ? parsed.map(normalizeSession) : [];
    }
    return [];
  },

  saveSession: (session: SessionData) => {
    if (typeof window !== "undefined") {
      const sessions = storage.getAllSessions();
      sessions.push(session);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    }
  },

  // Current Session (temporary storage)
  setCurrentSession: (session: SessionData) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    }
  },

  getCurrentSession: (): SessionData | null => {
    if (typeof window !== "undefined") {
      const session = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      return session ? normalizeSession(JSON.parse(session)) : null;
    }
    return null;
  },

  clearCurrentSession: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    }
  },

  // Stats calculation
  calculateStats: (): UserStats => {
    const sessions = storage.getAllSessions();
    const allAttempts: QuestionAttempt[] = sessions.flatMap((s) => s.attempts);

    const categoryStats: UserStats["categoryStats"] = {};

    for (const attempt of allAttempts) {
      if (!categoryStats[attempt.category]) {
        categoryStats[attempt.category] = {
          attempts: 0,
          correct: 0,
          averageThinkTime: 0,
          averageExplanationTime: 0,
        };
      }

      categoryStats[attempt.category].attempts++;
      if (attempt.isCorrect) {
        categoryStats[attempt.category].correct++;
      }
    }

    for (const category of Object.keys(categoryStats)) {
      const categoryAttempts = allAttempts.filter((a) => a.category === category);
      const totalThinkTime = categoryAttempts.reduce((sum, a) => sum + a.thinkTime, 0);
      const totalExplanationTime = categoryAttempts.reduce(
        (sum, a) => sum + a.explanationTime,
        0
      );
      categoryStats[category].averageThinkTime =
        categoryAttempts.length > 0 ? totalThinkTime / categoryAttempts.length : 0;
      categoryStats[category].averageExplanationTime =
        categoryAttempts.length > 0 ? totalExplanationTime / categoryAttempts.length : 0;
    }

    const totalCorrect = allAttempts.filter((a) => a.isCorrect).length;
    const totalThinkTime = allAttempts.reduce((sum, a) => sum + a.thinkTime, 0);
    const totalExplanationTime = allAttempts.reduce(
      (sum, a) => sum + a.explanationTime,
      0
    );

    return {
      totalAttempts: allAttempts.length,
      correctAnswers: totalCorrect,
      averageThinkTime: allAttempts.length > 0 ? totalThinkTime / allAttempts.length : 0,
      averageExplanationTime:
        allAttempts.length > 0 ? totalExplanationTime / allAttempts.length : 0,
      categoryStats,
    };
  },

  // Wrong questions for redemption (per event)
  getWrongQuestions: (eventId?: string): number[] => {
    if (typeof window !== "undefined") {
      if (eventId) {
        const key = `${STORAGE_KEYS.WRONG_QUESTIONS}_${eventId}`;
        const wrong = localStorage.getItem(key);
        return wrong ? JSON.parse(wrong) : [];
      }
      const wrong = localStorage.getItem(STORAGE_KEYS.WRONG_QUESTIONS);
      return wrong ? JSON.parse(wrong) : [];
    }
    return [];
  },

  addWrongQuestion: (eventId: string, questionId: number) => {
    if (typeof window !== "undefined") {
      const key = `${STORAGE_KEYS.WRONG_QUESTIONS}_${eventId}`;
      const wrong = storage.getWrongQuestions(eventId);
      if (!wrong.includes(questionId)) {
        wrong.push(questionId);
        localStorage.setItem(key, JSON.stringify(wrong));
      }
    }
  },

  removeWrongQuestion: (eventId: string, questionId: number) => {
    if (typeof window !== "undefined") {
      const key = `${STORAGE_KEYS.WRONG_QUESTIONS}_${eventId}`;
      const wrong = storage.getWrongQuestions(eventId);
      const filtered = wrong.filter((id) => id !== questionId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  },

  // Completed questions tracking (per event)
  getCompletedQuestions: (eventId?: string): number[] => {
    if (typeof window !== "undefined") {
      if (eventId) {
        const key = `${STORAGE_KEYS.COMPLETED_QUESTIONS}_${eventId}`;
        const completed = localStorage.getItem(key);
        return completed ? JSON.parse(completed) : [];
      }
      const completed = localStorage.getItem(STORAGE_KEYS.COMPLETED_QUESTIONS);
      return completed ? JSON.parse(completed) : [];
    }
    return [];
  },

  addCompletedQuestion: (eventId: string, questionId: number) => {
    if (typeof window !== "undefined") {
      const key = `${STORAGE_KEYS.COMPLETED_QUESTIONS}_${eventId}`;
      const completed = storage.getCompletedQuestions(eventId);
      if (!completed.includes(questionId)) {
        completed.push(questionId);
        localStorage.setItem(key, JSON.stringify(completed));
      }
    }
  },

  // Get list of events that have been practiced
  getPracticedEvents: (): string[] => {
    if (typeof window !== "undefined") {
      const sessions = storage.getAllSessions();
      const events = new Set<string>();
      sessions.forEach((session) => {
        if (session.eventId) {
          events.add(session.eventId);
        }
      });
      return Array.from(events);
    }
    return [];
  },

  // Calculate stats for a specific event
  calculateEventStats: (eventId: string): UserStats => {
    const sessions = storage.getAllSessions();
    const eventAttempts = sessions
      .flatMap((s) => s.attempts)
      .filter((a) => a.eventId === eventId);

    const categoryStats: UserStats["categoryStats"] = {};

    for (const attempt of eventAttempts) {
      if (!categoryStats[attempt.category]) {
        categoryStats[attempt.category] = {
          attempts: 0,
          correct: 0,
          averageThinkTime: 0,
          averageExplanationTime: 0,
        };
      }

      categoryStats[attempt.category].attempts++;
      if (attempt.isCorrect) {
        categoryStats[attempt.category].correct++;
      }
    }

    for (const category of Object.keys(categoryStats)) {
      const categoryAttempts = eventAttempts.filter((a) => a.category === category);
      const totalThinkTime = categoryAttempts.reduce((sum, a) => sum + a.thinkTime, 0);
      const totalExplanationTime = categoryAttempts.reduce(
        (sum, a) => sum + a.explanationTime,
        0
      );
      categoryStats[category].averageThinkTime =
        categoryAttempts.length > 0 ? totalThinkTime / categoryAttempts.length : 0;
      categoryStats[category].averageExplanationTime =
        categoryAttempts.length > 0 ? totalExplanationTime / categoryAttempts.length : 0;
    }

    const totalCorrect = eventAttempts.filter((a) => a.isCorrect).length;
    const totalThinkTime = eventAttempts.reduce((sum, a) => sum + a.thinkTime, 0);
    const totalExplanationTime = eventAttempts.reduce(
      (sum, a) => sum + a.explanationTime,
      0
    );

    return {
      totalAttempts: eventAttempts.length,
      correctAnswers: totalCorrect,
      averageThinkTime: eventAttempts.length > 0 ? totalThinkTime / eventAttempts.length : 0,
      averageExplanationTime:
        eventAttempts.length > 0 ? totalExplanationTime / eventAttempts.length : 0,
      categoryStats,
    };
  },

  // Reset all data
  resetAllData: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      localStorage.removeItem(STORAGE_KEYS.WRONG_QUESTIONS);
      localStorage.removeItem(STORAGE_KEYS.COMPLETED_QUESTIONS);
    }
  },
};

export const sessionUtils = {
  calculateSessionTotals,
  normalizeSession,
};
