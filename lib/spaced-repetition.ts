export interface UserQuestionProgress {
  questionId: string;
  repetitionCount: number;
  correctCount: number;
  incorrectCount: number;
  streakCorrect: number;

  easeFactor: number;
  intervalDays: number;
  nextDueDate: string;
  nextDueTime?: string;

  lastSeenDate: string;
  lastResponseTime: number;

  qualityScore: number;
  lastQualityScore: number;

  recentQualityScores: number[];
  recentCorrectness: boolean[];
  averageResponseTime: number;
}

const MIN_EF = 1.3;
const MAX_EF = 2.8;

export type SpeedClass = "FAST" | "NORMAL" | "SLOW";

export function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function classifySpeed(seconds: number): SpeedClass {
  if (seconds <= 5) return "FAST";
  if (seconds <= 30) return "NORMAL";
  return "SLOW";
}

function nextEf(ef: number, q: number) {
  const updated = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return Math.min(MAX_EF, Math.max(MIN_EF, Number(updated.toFixed(2))));
}

export function computeQualityScore(params: {
  isCorrect: boolean;
  progress?: UserQuestionProgress;
  responseTime: number;
}) {
  const { isCorrect, progress, responseTime } = params;
  const speed = classifySpeed(responseTime);
  const first = !progress || progress.repetitionCount === 0;

  if (!isCorrect) {
    if (speed === "SLOW") return 1;
    return 2;
  }

  if (first) return 4;

  const hadIncorrect = (progress?.incorrectCount ?? 0) > 0;
  if (speed === "FAST" && (progress?.streakCorrect ?? 0) >= 2) return 5;
  if (hadIncorrect && (progress?.streakCorrect ?? 0) < 2) return 3;
  return 4;
}

export function makeDefaultProgress(questionId: number, today = todayDateString()): UserQuestionProgress {
  return {
    questionId: String(questionId),
    repetitionCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    streakCorrect: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextDueDate: today,
    lastSeenDate: today,
    lastResponseTime: 0,
    qualityScore: 0,
    lastQualityScore: 0,
    recentQualityScores: [],
    recentCorrectness: [],
    averageResponseTime: 0,
  };
}

export function updateProgress(questionId: number, prev: UserQuestionProgress | undefined, isCorrect: boolean, responseTime: number, today = todayDateString()): UserQuestionProgress {
  const base = prev ?? makeDefaultProgress(questionId, today);
  const q = computeQualityScore({ isCorrect, progress: base, responseTime });
  const ef = nextEf(base.easeFactor, q);
  const speed = classifySpeed(responseTime);
  const hadIncorrect = base.incorrectCount > 0;
  const streak = isCorrect ? base.streakCorrect + 1 : 0;

  let interval = 1;

  if (!isCorrect) {
    interval = speed === "SLOW" ? 0 : 1;
  } else {
    const s = streak;
    const baseInterval = s === 1 ? 2 : s === 2 ? 4 : s === 3 ? 10 : Math.min(180, Math.round(Math.max(10, base.intervalDays) * ef));
    const performanceModifier = s === 1 ? 1 : s === 2 ? 1.3 : 1.8;
    const speedModifier = speed === "FAST" ? 1.2 : speed === "SLOW" ? 0.7 : 1;
    const failureModifier = hadIncorrect ? 0.6 : 1;
    interval = Math.max(1, Math.round(baseInterval * ef * performanceModifier * speedModifier * failureModifier));
  }

  const nextDueDate = addDays(today, interval);
  const nextDueTime = interval <= 1 ? new Date(Date.now() + (interval === 0 ? 2 : 24) * 3600 * 1000).toISOString().slice(11, 16) : undefined;

  const recentQualityScores = [...base.recentQualityScores, q].slice(-5);
  const recentCorrectness = [...base.recentCorrectness, isCorrect].slice(-5);
  const newCount = base.repetitionCount + 1;
  const averageResponseTime = Number((((base.averageResponseTime * base.repetitionCount) + responseTime) / newCount).toFixed(2));

  return {
    ...base,
    repetitionCount: newCount,
    correctCount: base.correctCount + (isCorrect ? 1 : 0),
    incorrectCount: base.incorrectCount + (isCorrect ? 0 : 1),
    streakCorrect: streak,
    easeFactor: ef,
    intervalDays: interval,
    nextDueDate,
    nextDueTime,
    lastSeenDate: today,
    lastResponseTime: responseTime,
    qualityScore: q,
    lastQualityScore: q,
    recentQualityScores,
    recentCorrectness,
    averageResponseTime,
  };
}

export function isMastered(progress: UserQuestionProgress) {
  const last3q = progress.recentQualityScores.slice(-3);
  const last5c = progress.recentCorrectness.slice(-5);
  return progress.streakCorrect >= 3 && last3q.length === 3 && last3q.every((score) => score >= 4) && !last5c.includes(false);
}
