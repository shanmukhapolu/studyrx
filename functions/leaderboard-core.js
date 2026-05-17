const crypto = require("crypto");

const LEADERBOARD_MIN_QUESTIONS = 10;
const OVERALL_EVENT_ID = "overall";
const PUBLISHED_EVENT_IDS = [
  "medical-terminology",
  "medical-spelling",
  "respiratory-therapy",
  "anatomy-and-physiology",
  "health-informatics",
];
const PUBLIC_OVERALL_ACCURACY_TOP5_PATH = "publicLeaderboards/overall/accuracy/top5";

const publishedEventIds = new Set(PUBLISHED_EVENT_IDS);

function roundAccuracy(correctAnswers, questionsAnswered) {
  if (questionsAnswered <= 0) return 0;
  return Math.round((correctAnswers / questionsAnswered) * 1000) / 10;
}

function parseNameParts(name) {
  const clean = String(name || "").trim().replace(/\s+/g, " ");
  if (!clean) return { displayName: "Student", initials: "S" };

  const [firstName = "Student", ...rest] = clean.split(" ");
  const lastName = rest.join(" ").trim();
  const displayName = lastName ? `${firstName} ${lastName.charAt(0).toUpperCase()}.` : firstName;
  const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();

  return {
    displayName,
    initials: initials || "S",
  };
}

function parseAttempts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sessionsFromRawUser(user = {}) {
  return Object.entries(user.events || {}).flatMap(([eventId, eventRecord]) => {
    return Object.entries((eventRecord && eventRecord.sessions) || {}).map(([sessionId, session]) => {
      const attempts = parseAttempts(session && session.attempts);
      const primaryAttempts = attempts.filter((attempt) => !attempt.isRedemption);
      const correctCount = primaryAttempts.filter((attempt) => attempt.isCorrect || attempt.correct).length;
      const totalQuestions = primaryAttempts.length;

      return {
        sessionId: session.sessionId || sessionId,
        sessionType: session.sessionType || "practice",
        event: session.event || session.eventId || eventId,
        startTimestamp: session.startTimestamp || session.startTime || new Date(0).toISOString(),
        endTimestamp: session.endTimestamp || session.endTime,
        totalThinkTime: typeof session.totalThinkTime === "number"
          ? session.totalThinkTime
          : attempts.reduce((sum, attempt) => sum + (attempt.thinkTime || attempt.timeSpent || 0), 0),
        totalExplanationTime: typeof session.totalExplanationTime === "number"
          ? session.totalExplanationTime
          : attempts.reduce((sum, attempt) => sum + (attempt.explanationTime || 0), 0),
        totalQuestions: typeof session.totalQuestions === "number" ? session.totalQuestions : totalQuestions,
        correctCount: typeof session.correctCount === "number" ? session.correctCount : correctCount,
        accuracy: typeof session.accuracy === "number" ? session.accuracy : roundAccuracy(correctCount, totalQuestions),
        attempts,
        startTime: session.startTime || session.startTimestamp,
        endTime: session.endTime || session.endTimestamp,
        eventId: session.eventId || session.event || eventId,
      };
    });
  });
}

function sortSessionsChronologically(sessions) {
  return [...sessions].sort((a, b) => {
    const aTime = new Date(a.endTimestamp || a.startTimestamp || 0).getTime();
    const bTime = new Date(b.endTimestamp || b.startTimestamp || 0).getTime();
    return aTime - bTime;
  });
}

function calculateStatsFromSessions(sessions, eventId) {
  let questionsAnswered = 0;
  let correctAnswers = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  sortSessionsChronologically(sessions).forEach((session) => {
    parseAttempts(session.attempts)
      .filter((attempt) => !attempt.isRedemption)
      .filter((attempt) => publishedEventIds.has(attempt.eventId || session.event))
      .filter((attempt) => !eventId || (attempt.eventId || session.event) === eventId)
      .sort((a, b) => {
        const aTime = new Date(a.timestampSubmit || a.timestampStart || a.timestamp || 0).getTime();
        const bTime = new Date(b.timestampSubmit || b.timestampStart || b.timestamp || 0).getTime();
        return aTime - bTime;
      })
      .forEach((attempt) => {
        const isCorrect = Boolean(attempt.isCorrect || attempt.correct);
        questionsAnswered += 1;
        if (isCorrect) {
          correctAnswers += 1;
          currentStreak += 1;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });
  });

  return {
    questionsAnswered,
    correctAnswers,
    accuracy: roundAccuracy(correctAnswers, questionsAnswered),
    longestStreak,
  };
}

function buildLeaderboardUserRecord(uid, user = {}) {
  const name = parseNameParts(user.name || user.displayName || user.email);
  const sessions = sessionsFromRawUser(user);
  const events = PUBLISHED_EVENT_IDS.reduce((acc, eventId) => {
    acc[eventId] = calculateStatsFromSessions(sessions, eventId);
    return acc;
  }, {});

  return {
    uid,
    ...name,
    updatedAt: new Date().toISOString(),
    overall: calculateStatsFromSessions(sessions),
    events,
  };
}

function compareAccuracyEntries(a, b) {
  return (
    b.overall.accuracy - a.overall.accuracy ||
    b.overall.questionsAnswered - a.overall.questionsAnswered ||
    b.overall.longestStreak - a.overall.longestStreak ||
    a.displayName.localeCompare(b.displayName)
  );
}

function publicIdForUid(uid) {
  return crypto.createHash("sha256").update(String(uid)).digest("hex").slice(0, 16);
}

function buildPublicOverallAccuracyTop5(records = {}) {
  return Object.values(records)
    .filter((record) => record && record.overall && record.overall.questionsAnswered >= LEADERBOARD_MIN_QUESTIONS)
    .sort(compareAccuracyEntries)
    .slice(0, 5)
    .map((record, index) => ({
      rank: index + 1,
      uid: publicIdForUid(record.uid),
      eventId: OVERALL_EVENT_ID,
      displayName: record.displayName || "Student",
      initials: record.initials || "S",
      accuracy: Number(record.overall.accuracy || 0),
      questionsAnswered: Number(record.overall.questionsAnswered || 0),
      longestStreak: Number(record.overall.longestStreak || 0),
      updatedAt: new Date().toISOString(),
    }));
}

module.exports = {
  LEADERBOARD_MIN_QUESTIONS,
  OVERALL_EVENT_ID,
  PUBLISHED_EVENT_IDS,
  PUBLIC_OVERALL_ACCURACY_TOP5_PATH,
  buildLeaderboardUserRecord,
  buildPublicOverallAccuracyTop5,
};
