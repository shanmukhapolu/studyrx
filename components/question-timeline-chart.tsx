import { type QuestionAttempt } from "@/lib/storage";

interface QuestionTimelineChartProps {
  attempts: QuestionAttempt[];
}

export function QuestionTimelineChart({ attempts }: QuestionTimelineChartProps) {
  const totalThinkTime = attempts.reduce((sum, attempt) => sum + attempt.thinkTime, 0);
  let cumulativeStart = 0;

  if (attempts.length === 0) {
    return <p className="text-sm text-muted-foreground">No attempts in this session.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Correct</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Incorrect</span>
        <span>X-axis: cumulative think time</span>
      </div>

      <div className="space-y-2">
        {attempts.map((attempt) => {
          const start = cumulativeStart;
          const widthPercent = totalThinkTime > 0 ? (attempt.thinkTime / totalThinkTime) * 100 : 0;
          const startPercent = totalThinkTime > 0 ? (start / totalThinkTime) * 100 : 0;
          cumulativeStart += attempt.thinkTime;

          return (
            <div key={`${attempt.questionId}-${attempt.questionIndex}`} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Q{attempt.questionIndex}</span>
                <span>{attempt.thinkTime}s</span>
              </div>
              <div className="h-6 w-full rounded-md bg-muted relative overflow-hidden">
                <div
                  className={`absolute inset-y-0 rounded-md ${attempt.isCorrect ? "bg-green-500" : "bg-red-500"}`}
                  style={{
                    left: `${startPercent}%`,
                    width: `${Math.max(widthPercent, 1)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
