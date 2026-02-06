import { type QuestionAttempt, type SessionData } from "@/lib/storage";

export interface DifficultyTimeSplit {
  think: number;
  explanation: number;
  attempts: number;
}

export interface SessionBreakdown {
  longestCorrectStreak: number;
  longestIncorrectStreak: number;
  hardestTopic: string;
  easiestTopic: string;
  avgThinkByDifficulty: Record<string, number>;
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds - minutes * 60;
  if (minutes === 0) return `${remSeconds.toFixed(1)}s`;
  return `${minutes}m ${remSeconds.toFixed(1)}s`;
}

export function getSessionTotalTime(session: SessionData) {
  return session.totalThinkTime + session.totalExplanationTime;
}

export function getDifficultyTimeSplits(attempts: QuestionAttempt[]) {
  const splits: Record<string, DifficultyTimeSplit> = {};
  attempts.forEach((attempt) => {
    if (!splits[attempt.difficulty]) {
      splits[attempt.difficulty] = { think: 0, explanation: 0, attempts: 0 };
    }
    splits[attempt.difficulty].attempts += 1;
    splits[attempt.difficulty].think += attempt.thinkTime;
    splits[attempt.difficulty].explanation += attempt.explanationTime;
  });
  return splits;
}

export function buildSessionBreakdown(session: SessionData): SessionBreakdown {
  let longestCorrectStreak = 0;
  let longestIncorrectStreak = 0;
  let currentCorrect = 0;
  let currentIncorrect = 0;

  const topicStats: Record<string, { attempts: number; correct: number }> = {};
  const difficultyStats: Record<string, { thinkTotal: number; count: number }> = {};

  session.attempts.forEach((attempt) => {
    if (attempt.isCorrect) {
      currentCorrect += 1;
      currentIncorrect = 0;
      longestCorrectStreak = Math.max(longestCorrectStreak, currentCorrect);
    } else {
      currentIncorrect += 1;
      currentCorrect = 0;
      longestIncorrectStreak = Math.max(longestIncorrectStreak, currentIncorrect);
    }

    if (!topicStats[attempt.category]) {
      topicStats[attempt.category] = { attempts: 0, correct: 0 };
    }
    topicStats[attempt.category].attempts += 1;
    if (attempt.isCorrect) topicStats[attempt.category].correct += 1;

    if (!difficultyStats[attempt.difficulty]) {
      difficultyStats[attempt.difficulty] = { thinkTotal: 0, count: 0 };
    }
    difficultyStats[attempt.difficulty].thinkTotal += attempt.thinkTime;
    difficultyStats[attempt.difficulty].count += 1;
  });

  const qualifiedTopics = Object.entries(topicStats)
    .filter(([, stat]) => stat.attempts >= 5)
    .map(([topic, stat]) => ({
      topic,
      accuracy: stat.correct / stat.attempts,
    }));

  const hardestTopic = qualifiedTopics.length
    ? qualifiedTopics.reduce((worst, current) => (current.accuracy < worst.accuracy ? current : worst)).topic
    : "Not enough data (min 5 attempts)";

  const easiestTopic = qualifiedTopics.length
    ? qualifiedTopics.reduce((best, current) => (current.accuracy > best.accuracy ? current : best)).topic
    : "Not enough data (min 5 attempts)";

  const avgThinkByDifficulty: Record<string, number> = {};
  Object.entries(difficultyStats).forEach(([difficulty, stats]) => {
    avgThinkByDifficulty[difficulty] = stats.count > 0 ? stats.thinkTotal / stats.count : 0;
  });

  return {
    longestCorrectStreak,
    longestIncorrectStreak,
    hardestTopic,
    easiestTopic,
    avgThinkByDifficulty,
  };
}
