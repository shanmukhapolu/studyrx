import { FIREBASE_DATABASE_URL } from "@/lib/firebase-config";

export interface SiteAnalyticsSummary {
  generatedAt: string;
  totalUsers: number;
  totalQuestions: number;
  questionsByEvent: Record<string, number>;
  questionsByDifficulty: Record<string, number>;
  activeUsersLast14Days: number;
  totalPracticeTimeSeconds: number;
  averagePracticeSessionDurationSeconds: number;
  mostPracticedEvent: { eventId: string; count: number } | null;
  leastPracticedEvent: { eventId: string; count: number } | null;
  accuracyByEvent: Record<string, { attempts: number; correct: number; accuracy: number }>;
  accuracyByDifficulty: Record<string, { attempts: number; correct: number; accuracy: number }>;
  eventPracticeCounts: Record<string, number>;
}

type Attempt = {
  eventId?: string;
  difficulty?: string;
  isCorrect?: boolean;
  correct?: boolean;
};

type SessionRecord = {
  event?: string;
  totalQuestions?: number;
  totalThinkTime?: number;
  totalExplanationTime?: number;
  attempts?: string | Attempt[];
  endTimestamp?: string;
};

function parseAttempts(raw: SessionRecord["attempts"]): Attempt[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildCacheKey() {
  return "adminAggregates/siteAnalytics";
}

export async function getSiteAnalytics(idToken: string, options?: { forceRefresh?: boolean }): Promise<SiteAnalyticsSummary> {
  const cachePath = buildCacheKey();

  if (!options?.forceRefresh) {
    const cacheRes = await fetch(`${FIREBASE_DATABASE_URL}/${cachePath}.json?auth=${encodeURIComponent(idToken)}`, { cache: "no-store" });
    if (cacheRes.ok) {
      const cached = await cacheRes.json();
      if (cached?.generatedAt) {
        const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
        if (ageMs >= 0 && ageMs < 15 * 60 * 1000) {
          return cached as SiteAnalyticsSummary;
        }
      }
    }
  }

  const [usersRes, questionsRes] = await Promise.all([
    fetch(`${FIREBASE_DATABASE_URL}/users.json?auth=${encodeURIComponent(idToken)}`, { cache: "no-store" }),
    fetch(`${FIREBASE_DATABASE_URL}/questions.json?auth=${encodeURIComponent(idToken)}`, { cache: "no-store" }),
  ]);

  const usersData = usersRes.ok ? ((await usersRes.json()) as Record<string, any> | null) : null;
  const questionsData = questionsRes.ok ? ((await questionsRes.json()) as Record<string, any> | null) : null;

  const users = Object.entries(usersData || {});
  const questions = Object.values(questionsData || {});

  const questionsByEvent: Record<string, number> = {};
  const questionsByDifficulty: Record<string, number> = {};

  for (const raw of questions) {
    const eventId = String((raw as any)?.eventId || "unknown");
    const difficulty = String((raw as any)?.difficulty || "unknown");
    questionsByEvent[eventId] = (questionsByEvent[eventId] || 0) + 1;
    questionsByDifficulty[difficulty] = (questionsByDifficulty[difficulty] || 0) + 1;
  }

  const eventPracticeCounts: Record<string, number> = {};
  const accuracyByEvent: Record<string, { attempts: number; correct: number; accuracy: number }> = {};
  const accuracyByDifficulty: Record<string, { attempts: number; correct: number; accuracy: number }> = {};

  let activeUsersLast14Days = 0;
  let totalPracticeTimeSeconds = 0;
  let totalSessions = 0;

  const threshold = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const [, user] of users) {
    const lastLoginAt = new Date(String(user?.lastLoginAt || 0)).getTime();
    let userActive = Number.isFinite(lastLoginAt) && lastLoginAt >= threshold;

    totalPracticeTimeSeconds += Number(user?.totalPracticeSeconds || 0);

    const events = (user?.events || {}) as Record<string, { sessions?: Record<string, SessionRecord> }>;
    for (const [eventId, eventData] of Object.entries(events)) {
      const sessions = Object.values(eventData?.sessions || {});
      if (sessions.length > 0) {
        eventPracticeCounts[eventId] = (eventPracticeCounts[eventId] || 0) + sessions.length;
      }

      for (const session of sessions) {
        totalSessions += 1;
        const computedDuration = Number(session.totalThinkTime || 0) + Number(session.totalExplanationTime || 0);
        if (computedDuration > 0) totalPracticeTimeSeconds += computedDuration;

        const sessionEnd = new Date(String(session.endTimestamp || 0)).getTime();
        if (!userActive && Number.isFinite(sessionEnd) && sessionEnd >= threshold) {
          userActive = true;
        }

        const attempts = parseAttempts(session.attempts);
        for (const attempt of attempts) {
          const attemptEvent = String(attempt.eventId || session.event || eventId || "unknown");
          const difficulty = String(attempt.difficulty || "unknown");
          const isCorrect = Boolean(attempt.isCorrect ?? attempt.correct ?? false);

          if (!accuracyByEvent[attemptEvent]) {
            accuracyByEvent[attemptEvent] = { attempts: 0, correct: 0, accuracy: 0 };
          }
          accuracyByEvent[attemptEvent].attempts += 1;
          if (isCorrect) accuracyByEvent[attemptEvent].correct += 1;

          if (!accuracyByDifficulty[difficulty]) {
            accuracyByDifficulty[difficulty] = { attempts: 0, correct: 0, accuracy: 0 };
          }
          accuracyByDifficulty[difficulty].attempts += 1;
          if (isCorrect) accuracyByDifficulty[difficulty].correct += 1;
        }
      }
    }

    if (userActive) activeUsersLast14Days += 1;
  }

  for (const stat of Object.values(accuracyByEvent)) {
    stat.accuracy = stat.attempts > 0 ? (stat.correct / stat.attempts) * 100 : 0;
  }

  for (const stat of Object.values(accuracyByDifficulty)) {
    stat.accuracy = stat.attempts > 0 ? (stat.correct / stat.attempts) * 100 : 0;
  }

  const rankedEvents = Object.entries(eventPracticeCounts).sort((a, b) => b[1] - a[1]);

  const summary: SiteAnalyticsSummary = {
    generatedAt: new Date().toISOString(),
    totalUsers: users.length,
    totalQuestions: questions.length,
    questionsByEvent,
    questionsByDifficulty,
    activeUsersLast14Days,
    totalPracticeTimeSeconds,
    averagePracticeSessionDurationSeconds: totalSessions > 0 ? totalPracticeTimeSeconds / totalSessions : 0,
    mostPracticedEvent: rankedEvents.length > 0 ? { eventId: rankedEvents[0][0], count: rankedEvents[0][1] } : null,
    leastPracticedEvent: rankedEvents.length > 0 ? { eventId: rankedEvents[rankedEvents.length - 1][0], count: rankedEvents[rankedEvents.length - 1][1] } : null,
    accuracyByEvent,
    accuracyByDifficulty,
    eventPracticeCounts,
  };

  await fetch(`${FIREBASE_DATABASE_URL}/${cachePath}.json?auth=${encodeURIComponent(idToken)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(summary),
  }).catch(() => undefined);

  return summary;
}
