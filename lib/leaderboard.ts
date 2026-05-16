import { HOSA_EVENTS } from "@/lib/events";
import { FIREBASE_DATABASE_URL } from "@/lib/firebase-config";
import { getStoredAuth, rtdbGet, rtdbSet } from "@/lib/rtdb";
import type { SessionData } from "@/lib/storage";

export const LEADERBOARD_MIN_QUESTIONS = 10;
export const OVERALL_EVENT_ID = "overall";

export type LeaderboardMetric = "accuracy" | "questionsAnswered" | "longestStreak";

export interface LeaderboardStats {
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  longestStreak: number;
}

export interface LeaderboardUserRecord {
  uid: string;
  displayName: string;
  initials: string;
  updatedAt: string;
  overall: LeaderboardStats;
  events: Record<string, LeaderboardStats>;
}

export interface LeaderboardEntry extends LeaderboardStats {
  uid: string;
  rank: number;
  displayName: string;
  initials: string;
  eventId: string;
}

export interface LeaderboardView {
  top: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  nearby: LeaderboardEntry[];
  totalRanked: number;
}

export const LEADERBOARD_METRICS: Array<{ id: LeaderboardMetric; label: string; description: string }> = [
  { id: "accuracy", label: "Accuracy", description: "Correct-answer rate with at least 10 questions answered." },
  { id: "questionsAnswered", label: "Questions Answered", description: "Total ranked practice questions completed." },
  { id: "longestStreak", label: "Longest Streak", description: "Best all-time correct-answer streak." },
];

export const PUBLISHED_LEADERBOARD_EVENTS = HOSA_EVENTS.filter((event) => event.published);

const publishedEventIds = new Set(PUBLISHED_LEADERBOARD_EVENTS.map((event) => event.id));

function emptyStats(): LeaderboardStats {
  return {
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    longestStreak: 0,
  };
}

function roundAccuracy(correctAnswers: number, questionsAnswered: number) {
  if (questionsAnswered <= 0) return 0;
  return Math.round((correctAnswers / questionsAnswered) * 1000) / 10;
}

function parseNameParts(name?: string | null) {
  const clean = (name || "").trim().replace(/\s+/g, " ");
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

function sortSessionsChronologically(sessions: SessionData[]) {
  return [...sessions].sort((a, b) => {
    const aTime = new Date(a.endTimestamp || a.startTimestamp || 0).getTime();
    const bTime = new Date(b.endTimestamp || b.startTimestamp || 0).getTime();
    return aTime - bTime;
  });
}

function calculateStatsFromSessions(sessions: SessionData[], eventId?: string): LeaderboardStats {
  let questionsAnswered = 0;
  let correctAnswers = 0;
  let currentStreak = 0;
  let longestStreak = 0;

  sortSessionsChronologically(sessions).forEach((session) => {
    session.attempts
      .filter((attempt) => !attempt.isRedemption)
      .filter((attempt) => publishedEventIds.has(attempt.eventId || session.event))
      .filter((attempt) => !eventId || (attempt.eventId || session.event) === eventId)
      .sort((a, b) => {
        const aTime = new Date(a.timestampSubmit || a.timestampStart || a.timestamp || 0).getTime();
        const bTime = new Date(b.timestampSubmit || b.timestampStart || b.timestamp || 0).getTime();
        return aTime - bTime;
      })
      .forEach((attempt) => {
        questionsAnswered += 1;
        if (attempt.isCorrect) {
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

export function buildLeaderboardUserRecord(uid: string, rawName: string | undefined | null, sessions: SessionData[]): LeaderboardUserRecord {
  const name = parseNameParts(rawName);
  const events = PUBLISHED_LEADERBOARD_EVENTS.reduce<Record<string, LeaderboardStats>>((acc, event) => {
    acc[event.id] = calculateStatsFromSessions(sessions, event.id);
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

async function fetchPublicLeaderboardUsers(): Promise<Record<string, LeaderboardUserRecord>> {
  const url = `${FIREBASE_DATABASE_URL}/leaderboard/users.json`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return {};
    return ((await res.json()) ?? {}) as Record<string, LeaderboardUserRecord>;
  } catch {
    return {};
  }
}

export async function getLeaderboardUsers(): Promise<Record<string, LeaderboardUserRecord>> {
  const publicUsers = await fetchPublicLeaderboardUsers();
  if (Object.keys(publicUsers).length > 0) return publicUsers;
  return rtdbGet<Record<string, LeaderboardUserRecord>>("leaderboard/users", {});
}

export async function updateCurrentUserLeaderboard(sessions: SessionData[]) {
  const auth = await getStoredAuth();
  if (!auth?.user?.uid) return;

  const userRecord = await rtdbGet<{ name?: string } | string | null>(`users/${auth.user.uid}`, null);
  const rawName = typeof userRecord === "string" ? userRecord : userRecord?.name || auth.user.displayName || auth.user.email;
  const record = buildLeaderboardUserRecord(auth.user.uid, rawName, sessions);
  await rtdbSet(`leaderboard/users/${auth.user.uid}`, record);
}

function getStatsForEvent(record: LeaderboardUserRecord, eventId: string): LeaderboardStats | null {
  if (eventId === OVERALL_EVENT_ID) return record.overall;
  if (!publishedEventIds.has(eventId)) return null;
  return record.events?.[eventId] ?? null;
}

function compareEntries(metric: LeaderboardMetric) {
  return (a: Omit<LeaderboardEntry, "rank">, b: Omit<LeaderboardEntry, "rank">) => {
    if (metric === "accuracy") {
      return (
        b.accuracy - a.accuracy ||
        b.questionsAnswered - a.questionsAnswered ||
        b.longestStreak - a.longestStreak ||
        a.displayName.localeCompare(b.displayName)
      );
    }

    if (metric === "questionsAnswered") {
      return (
        b.questionsAnswered - a.questionsAnswered ||
        b.accuracy - a.accuracy ||
        b.longestStreak - a.longestStreak ||
        a.displayName.localeCompare(b.displayName)
      );
    }

    return (
      b.longestStreak - a.longestStreak ||
      b.accuracy - a.accuracy ||
      b.questionsAnswered - a.questionsAnswered ||
      a.displayName.localeCompare(b.displayName)
    );
  };
}

export function buildLeaderboardView(
  records: Record<string, LeaderboardUserRecord>,
  options: { eventId: string; metric: LeaderboardMetric; currentUserId?: string | null; topLimit?: number }
): LeaderboardView {
  const ranked = Object.values(records)
    .map((record) => {
      const stats = getStatsForEvent(record, options.eventId);
      if (!stats || stats.questionsAnswered < LEADERBOARD_MIN_QUESTIONS) return null;
      return {
        uid: record.uid,
        displayName: record.displayName || "Student",
        initials: record.initials || "S",
        eventId: options.eventId,
        ...stats,
      } satisfies Omit<LeaderboardEntry, "rank">;
    })
    .filter((entry): entry is Omit<LeaderboardEntry, "rank"> => Boolean(entry))
    .sort(compareEntries(options.metric))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const currentUser = options.currentUserId ? ranked.find((entry) => entry.uid === options.currentUserId) ?? null : null;
  const currentIndex = currentUser ? ranked.findIndex((entry) => entry.uid === currentUser.uid) : -1;
  const topLimit = options.topLimit ?? 10;

  return {
    top: ranked.slice(0, topLimit),
    currentUser,
    nearby: currentIndex >= topLimit ? ranked.slice(Math.max(0, currentIndex - 1), currentIndex + 2) : [],
    totalRanked: ranked.length,
  };
}

export function getMetricValue(entry: LeaderboardStats, metric: LeaderboardMetric) {
  if (metric === "accuracy") return `${entry.accuracy.toFixed(1)}%`;
  if (metric === "questionsAnswered") return entry.questionsAnswered.toLocaleString();
  return entry.longestStreak.toLocaleString();
}
