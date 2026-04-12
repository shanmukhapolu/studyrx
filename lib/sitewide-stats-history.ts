import { calculateSitewideStatsAsOf, type SitewideStats, type SitewideStatsUserRecord } from "@/lib/sitewide-stats";

export type SitewideStatsSnapshot = {
  dateKey: string;
  timestamp: string;
  stats: SitewideStats;
};

export type SitewideStatsHistoryByDate = Record<string, SitewideStatsSnapshot>;

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function getEarliestDate(users: Record<string, SitewideStatsUserRecord>, fallback: Date) {
  const timestamps: number[] = [];

  Object.values(users).forEach((user) => {
    const createdMs = user.createdAt ? new Date(user.createdAt).getTime() : Number.NaN;
    if (Number.isFinite(createdMs)) timestamps.push(createdMs);

    Object.values(user.events ?? {}).forEach((eventRecord) => {
      Object.values(eventRecord.sessions ?? {}).forEach((session) => {
        const timestamp = session.startTimestamp ?? session.startTime ?? session.endTimestamp ?? session.endTime;
        if (!timestamp) return;
        const sessionMs = new Date(timestamp).getTime();
        if (Number.isFinite(sessionMs)) timestamps.push(sessionMs);
      });
    });
  });

  if (timestamps.length === 0) return fallback;
  return new Date(Math.min(...timestamps));
}

export function buildMissingDailySnapshots(
  users: Record<string, SitewideStatsUserRecord>,
  existing: SitewideStatsHistoryByDate,
  now = new Date(),
): SitewideStatsHistoryByDate {
  const earliest = startOfUtcDay(getEarliestDate(users, now));
  const today = startOfUtcDay(now);
  const missing: SitewideStatsHistoryByDate = {};

  for (let cursor = new Date(earliest); cursor.getTime() <= today.getTime(); cursor = new Date(cursor.getTime() + 86_400_000)) {
    const key = formatDateKey(cursor);
    if (existing[key]) continue;

    const snapshotTimestamp = endOfUtcDay(cursor);
    missing[key] = {
      dateKey: key,
      timestamp: snapshotTimestamp.toISOString(),
      stats: calculateSitewideStatsAsOf(users, snapshotTimestamp),
    };
  }

  return missing;
}

export function toOrderedSnapshots(history: SitewideStatsHistoryByDate) {
  return Object.values(history).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
