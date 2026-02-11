import { type QuestionAttempt } from "@/lib/storage";

interface QuestionTimelineChartProps {
  attempts: QuestionAttempt[];
}

export function QuestionTimelineChart({ attempts }: QuestionTimelineChartProps) {
  if (attempts.length === 0) {
    return <p className="text-sm text-muted-foreground">No attempts in this session.</p>;
  }

  const chartWidth = 900;
  const chartHeight = Math.max(320, attempts.length * 28 + 80);
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const totalThinkTime = attempts.reduce((sum, attempt) => sum + attempt.thinkTime, 0);
  const xMax = Math.max(totalThinkTime, 1);
  const yCount = attempts.length;
  const rowHeight = innerHeight / yCount;

  let cumulativeThink = 0;
  const bars = attempts.map((attempt) => {
    const xStart = padding.left + (cumulativeThink / xMax) * innerWidth;
    const width = Math.max((attempt.thinkTime / xMax) * innerWidth, 2);
    const yIndexFromBottom = attempt.questionIndex - 1;
    const y = padding.top + innerHeight - (yIndexFromBottom + 1) * rowHeight + rowHeight * 0.15;
    cumulativeThink += attempt.thinkTime;

    return {
      ...attempt,
      xStart,
      width,
      y,
      height: rowHeight * 0.7,
    };
  });

  const xTicks = 6;
  const yTicks = attempts.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Correct</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Incorrect</span>
        <span>Hover bars for exact think time</span>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border bg-card p-2">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="min-w-[720px] w-full h-auto">
          {[...Array(xTicks + 1)].map((_, i) => {
            const x = padding.left + (i / xTicks) * innerWidth;
            const tickValue = (xMax * i) / xTicks;
            return (
              <g key={`x-grid-${i}`}>
                <line x1={x} x2={x} y1={padding.top} y2={padding.top + innerHeight} className="stroke-border" strokeDasharray="4 4" />
                <text x={x} y={chartHeight - 10} textAnchor="middle" className="fill-muted-foreground text-[10px]">{tickValue.toFixed(1)}s</text>
              </g>
            );
          })}

          {[...Array(yTicks + 1)].map((_, i) => {
            const y = padding.top + (i / yTicks) * innerHeight;
            return <line key={`y-grid-${i}`} x1={padding.left} x2={padding.left + innerWidth} y1={y} y2={y} className="stroke-border" strokeDasharray="4 4" />;
          })}

          <line x1={padding.left} x2={padding.left} y1={padding.top} y2={padding.top + innerHeight} className="stroke-foreground" />
          <line x1={padding.left} x2={padding.left + innerWidth} y1={padding.top + innerHeight} y2={padding.top + innerHeight} className="stroke-foreground" />

          {bars.map((bar) => (
            <g key={`${bar.questionId}-${bar.questionIndex}`}>
              <rect
                x={bar.xStart}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={3}
                className={bar.isCorrect ? "fill-green-500/90" : "fill-red-500/90"}
              >
                <title>{`Q${bar.questionIndex}: ${bar.thinkTime.toFixed(1)}s think time`}</title>
              </rect>
              <text
                x={padding.left - 8}
                y={bar.y + bar.height / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {bar.questionIndex}
              </text>
            </g>
          ))}

          <text x={padding.left + innerWidth / 2} y={chartHeight - 2} textAnchor="middle" className="fill-muted-foreground text-[11px]">
            Cumulative Think Time (seconds)
          </text>
          <text
            x={12}
            y={padding.top + innerHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${padding.top + innerHeight / 2})`}
            className="fill-muted-foreground text-[11px]"
          >
            Question Index (bottom-up)
          </text>
        </svg>
      </div>
    </div>
  );
}
