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

const STORAGE_KEYS = {
  SESSIONS: "studyrx_sessions",
  CURRENT_SESSION: "studyrx_current_session",
  WRONG_QUESTIONS: "studyrx_wrong_questions",
  COMPLETED_QUESTIONS: "studyrx_completed_questions",
} as const;

function createDeterministicSessionId() {
  const now = Date.now();
  const seed = Math.random().toString(36).slice(2, 8);
  return `session_${now}_${seed}`;
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
  const attempts = (session.attempts ?? []).map((attempt, index) =>
    normalizeAttempt(attempt, index, event)
  );
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

  // Sessions
  getAllSessions: (): SessionData[] => {
    if (typeof window !== "undefined") {
      const sessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const parsed: Partial<SessionData>[] = sessions ? JSON.parse(sessions) : [];
      return parsed.map(normalizeSession);
    }
    return [];
  },

  saveSession: (session: SessionData) => {
    if (typeof window !== "undefined") {
      const sessions = storage.getAllSessions();
      const immutableSession = normalizeSession({
        ...session,
        endTimestamp: session.endTimestamp ?? new Date().toISOString(),
      });
      sessions.push(immutableSession);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    }
  },

  // Current Session (temporary storage)
  setCurrentSession: (session: SessionData) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(normalizeSession(session)));
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
          averageTime: 0,
        };
      }

      categoryStats[attempt.category].attempts++;
      if (attempt.isCorrect) {
        categoryStats[attempt.category].correct++;
      }
    }

    // Calculate average times
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
        if (session.event) {
          events.add(session.event);
        }
      });
      return Array.from(events);
    }
    return [];
  },

  // Calculate stats for a specific event
  calculateEventStats: (eventId: string): UserStats => {
    const sessions = storage.getAllSessions();
    const eventAttempts = sessions.flatMap((s) => s.attempts).filter((a) => a.eventId === eventId);

    const categoryStats: UserStats["categoryStats"] = {};

    for (const attempt of eventAttempts) {
      if (!categoryStats[attempt.category]) {
        categoryStats[attempt.category] = {
          attempts: 0,
          correct: 0,
          averageTime: 0,
        };
      }

      categoryStats[attempt.category].attempts++;
      if (attempt.isCorrect) {
        categoryStats[attempt.category].correct++;
      }
    }

    // Calculate average times
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
