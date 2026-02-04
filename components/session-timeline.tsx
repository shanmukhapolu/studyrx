"use client";

import { QuestionAttempt } from "@/lib/storage";

interface SessionTimelineProps {
  attempts: QuestionAttempt[];
}

export function SessionTimeline({ attempts }: SessionTimelineProps) {
  const totalThinkTime = attempts.reduce((sum, attempt) => sum + attempt.thinkTime, 0);
  const cumulativeTimes = attempts.reduce<number[]>((acc, attempt, index) => {
    const previous = index === 0 ? 0 : acc[index - 1] + attempts[index - 1].thinkTime;
    acc.push(previous);
    return acc;
  }, []);

  if (attempts.length === 0) {
    return <div className="text-sm text-muted-foreground">No attempts logged.</div>;
  }

  if (totalThinkTime === 0) {
    return <div className="text-sm text-muted-foreground">Think time data is unavailable.</div>;
  }

  return (
    <div className="space-y-3">
      {attempts.map((attempt, index) => {
        const start = cumulativeTimes[index];
        const widthPercent = (attempt.thinkTime / totalThinkTime) * 100;
        const startPercent = (start / totalThinkTime) * 100;
        const colorClass = attempt.isCorrect ? "bg-emerald-500" : "bg-rose-500";

        return (
          <div key={`${attempt.questionId}-${index}`} className="grid grid-cols-[60px_1fr] items-center gap-3">
            <div className="text-xs text-muted-foreground">Q{attempt.questionIndex}</div>
            <div className="relative h-4 w-full rounded-full bg-muted/40 overflow-hidden">
              <div
                className={`absolute h-full rounded-full ${colorClass}`}
                style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
