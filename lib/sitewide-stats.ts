import { getEventName } from "@/lib/events";

type UserRecord = {
  createdAt?: string;
  lastLogin?: string;
  events?: Record<string, { sessions?: Record<string, RawSiteSession> }>;
};

type RawSiteSession = {
  attempts?: string | SiteAttempt[];
  accuracy?: number;
  totalThinkTime?: number;
  totalExplanationTime?: number;
  startTimestamp?: string;
  endTimestamp?: string;
  startTime?: string;
  endTime?: string;
};

type SiteAttempt = {
  isCorrect?: boolean;
  isRedemption?: boolean;
  eventId?: string;
  thinkTime?: number;
  explanationTime?: number;
};

type SiteSession = {
  uid: string;
  sessionId: string;
  eventId: string;
  accuracy: number;
  attempts: SiteAttempt[];
  totalThinkTime?: number;
  totalExplanationTime?: number;
  startTimestamp?: string;
  endTimestamp?: string;
};

export type SitewideStats = {
  adoption: {
    totalUsers: number;
    newUsersLast7Days: number;
    activeUsersLast7Days: number;
    loginUsersLast7Days: number;
    growthRateWeekOverWeek: number;
  };
  engagement: {
    totalSessionsCompleted: number;
    avgSessionsPerUser: number;
    avgQuestionsPerSession: number;
    avgTimePerSessionSeconds: number;
    totalThinkTimeSeconds: number;
    totalExplanationTimeSeconds: number;
    retentionAfterFirstSessionPct: number;
  };
  learningEffectiveness: {
    overallAverageAccuracyPct: number;
    redemptionRoundAvgAccuracyPct: number;
    avgImprovementFirstToLastSameEventPct: number;
  };
  contentAnalytics: {
    mostUsedEvent: string;
    leastUsedEvent: string;
    totalQuestionsAttempted: number;
    averageAccuracyPerEvent: Record<string, number>;
    perEventStats: Record<string, {
      accuracyPct: number;
      questionsAttempted: number;
      usersCount: number;
      practiceTimeSeconds: number;
    }>;
  };
  retention: {
    avgDaysBetweenSessionsPerUser: number;
    usersWithAtLeast2SessionsPct: number;
    usersWithAtLeast5SessionsPct: number;
  };
  generatedAt: string;
};

function toMillis(value?: string) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function safeAverage(total: number, count: number) {
  return count > 0 ? total / count : 0;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function parseAttempts(raw: string | SiteAttempt[] | undefined): SiteAttempt[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SiteAttempt[]) : [];
  } catch {
    return [];
  }
}

function collectSessions(users: Record<string, UserRecord>) {
  const sessions: SiteSession[] = [];

  Object.entries(users).forEach(([uid, user]) => {
    const events = user.events ?? {};
    Object.entries(events).forEach(([eventId, eventRecord]) => {
      const eventSessions = eventRecord.sessions ?? {};
      Object.entries(eventSessions).forEach(([sessionId, rawSession]) => {
        const attempts = parseAttempts(rawSession.attempts);
        const derivedThinkTime = attempts.reduce((sum, attempt) => sum + (attempt.thinkTime ?? 0), 0);
        const derivedExplanationTime = attempts.reduce((sum, attempt) => sum + (attempt.explanationTime ?? 0), 0);
        sessions.push({
          uid,
          sessionId,
          eventId,
          attempts,
          totalThinkTime: typeof rawSession.totalThinkTime === "number"
            ? rawSession.totalThinkTime
            : derivedThinkTime,
          totalExplanationTime: typeof rawSession.totalExplanationTime === "number"
            ? rawSession.totalExplanationTime
            : derivedExplanationTime,
          accuracy: typeof rawSession.accuracy === "number" ? rawSession.accuracy : (attempts.length ? (attempts.filter((attempt) => attempt.isCorrect).length / attempts.length) * 100 : 0),
          startTimestamp: rawSession.startTimestamp ?? rawSession.startTime,
          endTimestamp: rawSession.endTimestamp ?? rawSession.endTime,
        });
      });
    });
  });

  return sessions;
}

function getSessionActiveTimeSeconds(session: SiteSession) {
  const thinkTime = session.totalThinkTime ?? session.attempts.reduce((total, attempt) => total + (attempt.thinkTime ?? 0), 0);
  const explanationTime = session.totalExplanationTime ?? session.attempts.reduce((total, attempt) => total + (attempt.explanationTime ?? 0), 0);
  return {
    thinkTime,
    explanationTime,
    total: thinkTime + explanationTime,
  };
}

export function calculateSitewideStats(users: Record<string, UserRecord>, now = new Date()): SitewideStats {
  const totalUsers = Object.keys(users).length;
  const nowMs = now.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDaysAgoMs = nowMs - 7 * oneDay;
  const fourteenDaysAgoMs = nowMs - 14 * oneDay;

  const sessions = collectSessions(users);
  const sessionsByUser = new Map<string, SiteSession[]>();
  const eventSessionCount: Record<string, number> = {};
  const eventAccumulators: Record<string, { totalAccuracy: number; count: number }> = {};
  const eventPracticeTimeTotals: Record<string, number> = {};
  const eventQuestionsAttempted: Record<string, number> = {};
  const eventUsers = new Map<string, Set<string>>();

  sessions.forEach((session) => {
    const userSessions = sessionsByUser.get(session.uid) ?? [];
    userSessions.push(session);
    sessionsByUser.set(session.uid, userSessions);

    eventSessionCount[session.eventId] = (eventSessionCount[session.eventId] ?? 0) + 1;

    if (!eventAccumulators[session.eventId]) {
      eventAccumulators[session.eventId] = { totalAccuracy: 0, count: 0 };
    }
    eventAccumulators[session.eventId].totalAccuracy += session.accuracy;
    eventAccumulators[session.eventId].count += 1;

    const activeTime = getSessionActiveTimeSeconds(session);
    eventPracticeTimeTotals[session.eventId] = (eventPracticeTimeTotals[session.eventId] ?? 0) + activeTime.thinkTime;
    eventQuestionsAttempted[session.eventId] = (eventQuestionsAttempted[session.eventId] ?? 0) + session.attempts.length;

    const usersForEvent = eventUsers.get(session.eventId) ?? new Set<string>();
    usersForEvent.add(session.uid);
    eventUsers.set(session.eventId, usersForEvent);
  });

  const newUsersLast7Days = Object.values(users).filter((user) => {
    const createdMs = toMillis(user.createdAt);
    return createdMs !== null && createdMs >= sevenDaysAgoMs;
  }).length;

  const prevWeekUsers = Object.values(users).filter((user) => {
    const createdMs = toMillis(user.createdAt);
    return createdMs !== null && createdMs >= fourteenDaysAgoMs && createdMs < sevenDaysAgoMs;
  }).length;

  const activeUserIdsLast7Days = new Set(
    sessions
      .filter((session) => {
        const sessionMs = toMillis(session.startTimestamp) ?? toMillis(session.endTimestamp);
        return sessionMs !== null && sessionMs >= sevenDaysAgoMs;
      })
      .map((session) => session.uid)
  );
  const activeUsersWithSessionLast7Days = activeUserIdsLast7Days.size;

  const loginUsersLast7Days = Object.values(users).filter((user) => {
    const loginMs = toMillis(user.lastLogin);
    return loginMs !== null && loginMs >= sevenDaysAgoMs;
  }).length;

  const growthRateWeekOverWeek = prevWeekUsers > 0
    ? ((newUsersLast7Days - prevWeekUsers) / prevWeekUsers) * 100
    : (newUsersLast7Days > 0 ? 100 : 0);

  const totalSessionsCompleted = sessions.length;
  const avgSessionsPerUser = safeAverage(totalSessionsCompleted, totalUsers);
  const totalQuestionsAttempted = sessions.reduce((sum, session) => sum + session.attempts.length, 0);
  const avgQuestionsPerSession = safeAverage(totalQuestionsAttempted, totalSessionsCompleted);

  const timeTotals = sessions.reduce((totals, session) => {
    const activeTime = getSessionActiveTimeSeconds(session);
    totals.think += activeTime.thinkTime;
    totals.explanation += activeTime.explanationTime;
    totals.total += activeTime.total;
    return totals;
  }, { think: 0, explanation: 0, total: 0 });
  const totalThinkTimeSeconds = timeTotals.think;
  const totalExplanationTimeSeconds = timeTotals.explanation;
  const totalActiveTimeSeconds = timeTotals.total;
  const avgTimePerSessionSeconds = safeAverage(totalActiveTimeSeconds, totalSessionsCompleted);

  const usersWithSessions = Array.from(sessionsByUser.values()).filter((items) => items.length > 0);
  const usersWhoReturnedAfterFirst = usersWithSessions.filter((items) => items.length > 1).length;
  const retentionAfterFirstSessionPct = safeAverage(usersWhoReturnedAfterFirst * 100, usersWithSessions.length);

  const allAttempts = sessions.flatMap((session) => session.attempts);
  const allPrimaryAttempts = allAttempts.filter((attempt) => !attempt.isRedemption);
  const overallAverageAccuracyPct = allPrimaryAttempts.length
    ? (allPrimaryAttempts.filter((attempt) => attempt.isCorrect).length / allPrimaryAttempts.length) * 100
    : 0;

  const redemptionAttempts = allAttempts.filter((attempt) => attempt.isRedemption);
  const redemptionRoundAvgAccuracyPct = redemptionAttempts.length
    ? (redemptionAttempts.filter((attempt) => attempt.isCorrect).length / redemptionAttempts.length) * 100
    : 0;

  const improvementDeltas: number[] = [];
  sessionsByUser.forEach((userSessions) => {
    const byEvent: Record<string, SiteSession[]> = {};
    userSessions.forEach((session) => {
      if (!byEvent[session.eventId]) byEvent[session.eventId] = [];
      byEvent[session.eventId].push(session);
    });

    Object.values(byEvent).forEach((eventSessions) => {
      if (eventSessions.length < 2) return;
      const ordered = [...eventSessions].sort((a, b) => (toMillis(a.startTimestamp) ?? 0) - (toMillis(b.startTimestamp) ?? 0));
      improvementDeltas.push(ordered[ordered.length - 1].accuracy - ordered[0].accuracy);
    });
  });

  const avgImprovementFirstToLastSameEventPct = safeAverage(
    improvementDeltas.reduce((sum, delta) => sum + delta, 0),
    improvementDeltas.length,
  );

  const sortedEventCounts = Object.entries(eventSessionCount).sort((a, b) => b[1] - a[1]);
  const mostUsedEvent = sortedEventCounts[0]?.[0] ? getEventName(sortedEventCounts[0][0]) : "—";
  const leastUsedEvent = sortedEventCounts[sortedEventCounts.length - 1]?.[0]
    ? getEventName(sortedEventCounts[sortedEventCounts.length - 1][0])
    : "—";

  const averageAccuracyPerEvent: Record<string, number> = {};
  const perEventStats: Record<string, {
    accuracyPct: number;
    questionsAttempted: number;
    usersCount: number;
    practiceTimeSeconds: number;
  }> = {};

  Object.entries(eventAccumulators).forEach(([eventId, bucket]) => {
    const eventName = getEventName(eventId);
    const accuracy = safeAverage(bucket.totalAccuracy, bucket.count);
    averageAccuracyPerEvent[eventName] = accuracy;
    perEventStats[eventName] = {
      accuracyPct: accuracy,
      questionsAttempted: eventQuestionsAttempted[eventId] ?? 0,
      usersCount: eventUsers.get(eventId)?.size ?? 0,
      practiceTimeSeconds: eventPracticeTimeTotals[eventId] ?? 0,
    };
  });

  let gapTotalDays = 0;
  let gapCount = 0;
  let usersWithAtLeast2Sessions = 0;
  let usersWithAtLeast5Sessions = 0;

  sessionsByUser.forEach((userSessions) => {
    const sorted = [...userSessions].sort((a, b) => (toMillis(a.startTimestamp) ?? 0) - (toMillis(b.startTimestamp) ?? 0));
    if (sorted.length >= 2) usersWithAtLeast2Sessions += 1;
    if (sorted.length >= 5) usersWithAtLeast5Sessions += 1;

    for (let index = 1; index < sorted.length; index += 1) {
      const prev = toMillis(sorted[index - 1].startTimestamp);
      const current = toMillis(sorted[index].startTimestamp);
      if (prev === null || current === null || current < prev) continue;
      gapTotalDays += (current - prev) / oneDay;
      gapCount += 1;
    }
  });


  return {
    adoption: {
      totalUsers,
      newUsersLast7Days,
      activeUsersLast7Days: activeUsersWithSessionLast7Days,
      loginUsersLast7Days,
      growthRateWeekOverWeek: round2(growthRateWeekOverWeek),
    },
    engagement: {
      totalSessionsCompleted,
      avgSessionsPerUser: round2(avgSessionsPerUser),
      avgQuestionsPerSession: round2(avgQuestionsPerSession),
      avgTimePerSessionSeconds: round2(avgTimePerSessionSeconds),
      totalThinkTimeSeconds: round2(totalThinkTimeSeconds),
      totalExplanationTimeSeconds: round2(totalExplanationTimeSeconds),
      retentionAfterFirstSessionPct: round2(retentionAfterFirstSessionPct),
    },
    learningEffectiveness: {
      overallAverageAccuracyPct: round2(overallAverageAccuracyPct),
      redemptionRoundAvgAccuracyPct: round2(redemptionRoundAvgAccuracyPct),
      avgImprovementFirstToLastSameEventPct: round2(avgImprovementFirstToLastSameEventPct),
    },
    contentAnalytics: {
      mostUsedEvent,
      leastUsedEvent,
      totalQuestionsAttempted,
      averageAccuracyPerEvent: Object.fromEntries(
        Object.entries(averageAccuracyPerEvent).sort((a, b) => b[1] - a[1]).map(([eventName, value]) => [eventName, round2(value)]),
      ),
      perEventStats: Object.fromEntries(
        Object.entries(perEventStats)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([eventName, stats]) => [eventName, {
            accuracyPct: round2(stats.accuracyPct),
            questionsAttempted: stats.questionsAttempted,
            usersCount: stats.usersCount,
            practiceTimeSeconds: round2(stats.practiceTimeSeconds),
          }]),
      ),
    },
    retention: {
      avgDaysBetweenSessionsPerUser: round2(safeAverage(gapTotalDays, gapCount)),
      usersWithAtLeast2SessionsPct: round2(safeAverage(usersWithAtLeast2Sessions * 100, totalUsers)),
      usersWithAtLeast5SessionsPct: round2(safeAverage(usersWithAtLeast5Sessions * 100, totalUsers)),
    },
    generatedAt: now.toISOString(),
  };
}
