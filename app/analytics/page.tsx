"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Activity, Flame, Medal, Orbit, Sparkles, Target, Timer } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { QuestionTimelineChart } from "@/components/question-timeline-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEventName } from "@/lib/events";
import { buildSessionBreakdown, formatDuration, getDifficultyTimeSplits, getSessionTotalTime } from "@/lib/session-analytics";
import { storage, type QuestionAttempt, type SessionData } from "@/lib/storage";

export default function AnalyticsPage() {
  return (
    <SidebarProvider>
      <AuthGuard>
        <AppSidebar />
        <SidebarInset>
          <AnalyticsContent />
        </SidebarInset>
      </AuthGuard>
    </SidebarProvider>
  );
}

function AnalyticsContent() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      const loadedSessions = await storage.getAllSessions();
      setSessions(loadedSessions);
    };

    loadSessions();
  }, []);

  const practicedEvents = useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach((session) => ids.add(session.event));
    return Array.from(ids);
  }, [sessions]);

  const attempts = sessions.flatMap((s) => s.attempts);
  if (attempts.length === 0) {
    return <div className="p-6 text-muted-foreground">No analytics data yet.</div>;
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent p-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="h-7 w-7 text-primary" /> Analytics Command</h1>
        <p className="text-muted-foreground mt-2">Organized, colorful insights for speed, accuracy, redemption, and mastery.</p>
      </header>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap h-auto border bg-card/70">
          <TabsTrigger value="general">General</TabsTrigger>
          {practicedEvents.map((eventId) => (
            <TabsTrigger key={eventId} value={eventId}>{getEventName(eventId)}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <GeneralStats sessions={sessions} onOpenSession={setSelectedSession} />
        </TabsContent>

        {practicedEvents.map((eventId) => (
          <TabsContent key={eventId} value={eventId}>
            <EventStats sessions={sessions.filter((s) => s.event === eventId)} eventId={eventId} onOpenSession={setSelectedSession} />
          </TabsContent>
        ))}
      </Tabs>

      {selectedSession && <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  );
}

function GeneralStats({ sessions, onOpenSession }: { sessions: SessionData[]; onOpenSession: (session: SessionData) => void }) {
  const attempts = sessions.flatMap((s) => s.attempts);
  const totalQuestions = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const incorrect = totalQuestions - correct;
  const totalThink = attempts.reduce((sum, a) => sum + a.thinkTime, 0);
  const totalExplanation = attempts.reduce((sum, a) => sum + a.explanationTime, 0);
  const totalTime = totalThink + totalExplanation;
  const avgTime = totalQuestions ? totalThink / totalQuestions : 0;
  const avgCorrectTime = correct ? attempts.filter((a) => a.isCorrect).reduce((s, a) => s + a.thinkTime, 0) / correct : 0;
  const avgWrongTime = incorrect ? attempts.filter((a) => !a.isCorrect).reduce((s, a) => s + a.thinkTime, 0) / incorrect : 0;

  const streak = getHighestStreak(attempts);
  const avgSessionLength = sessions.length ? sessions.reduce((s, session) => s + getSessionTotalTime(session), 0) / sessions.length : 0;

  const events = groupByEvent(sessions);
  const sortedEvents = Object.entries(events)
    .map(([eventId, stats]) => ({
      eventId,
      ...stats,
      accuracy: stats.questions ? (stats.correct / stats.questions) * 100 : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const bestEvent = sortedEvents[0];
  const worstEvent = sortedEvents[sortedEvents.length - 1];
  const mostTimeEvent = [...sortedEvents].sort((a, b) => b.totalTime - a.totalTime)[0];

  const difficulty = getDifficultyTimeSplits(attempts);
  const redemptionAttempts = attempts.filter((a) => a.isRedemption);
  const redemptionCorrect = redemptionAttempts.filter((a) => a.isCorrect).length;

  return (
    <div className="space-y-5">
      <SectionCard title="Performance Overview" subtitle="Core progress stats" icon={<Target className="h-5 w-5 text-primary" />}>
        <MetricGrid>
          <Metric label="Questions Answered" value={`${totalQuestions}`} accent="primary" />
          <Metric label="Accuracy" value={`${((correct / totalQuestions) * 100).toFixed(1)}%`} accent="accent" />
          <Metric label="Avg Time" value={`${avgTime.toFixed(1)}s`} />
          <Metric label="Avg Time (Correct)" value={`${avgCorrectTime.toFixed(1)}s`} />
          <Metric label="Avg Time (Wrong)" value={`${avgWrongTime.toFixed(1)}s`} />
          <Metric label="Highest Streak" value={`${streak}`} />
          <Metric label="Total Time Practicing" value={formatDuration(totalTime)} accent="primary" />
          <Metric label="Avg Session Length" value={formatDuration(avgSessionLength)} />
        </MetricGrid>
      </SectionCard>

      <SectionCard title="Time Intelligence" subtitle="Think vs explanation behavior" icon={<Orbit className="h-5 w-5 text-accent" />}>
        <MetricGrid>
          <Metric label="Avg Think Time" value={`${(totalQuestions ? totalThink / totalQuestions : 0).toFixed(1)}s`} />
          <Metric label="Avg Explanation Time" value={`${(totalQuestions ? totalExplanation / totalQuestions : 0).toFixed(1)}s`} />
          <Metric label="Think : Explanation Ratio" value={totalExplanation > 0 ? `${(totalThink / totalExplanation).toFixed(2)} : 1` : "N/A"} />
          <Metric label="Events" value={`${sortedEvents.length}`} />
        </MetricGrid>
      </SectionCard>

      <SectionCard title="Event Insights" subtitle="Best/worst and performance by event" icon={<Medal className="h-5 w-5 text-primary" />}>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm mb-3">
          Best event: <strong>{bestEvent ? getEventName(bestEvent.eventId) : "N/A"}</strong> • Worst event: <strong>{worstEvent ? getEventName(worstEvent.eventId) : "N/A"}</strong> • Event with most time spent: <strong>{mostTimeEvent ? getEventName(mostTimeEvent.eventId) : "N/A"}</strong>
        </div>
        <BreakdownRows rows={sortedEvents.map((event) => ({ label: getEventName(event.eventId), value: `${event.accuracy.toFixed(1)}% (${event.correct}/${event.questions})` }))} />
      </SectionCard>

      <SectionCard title="Difficulty Breakdown" subtitle="Pacing by level" icon={<Flame className="h-5 w-5 text-chart-3" />}>
        <div className="grid gap-3 md:grid-cols-3">
          <SimpleBreakdownCard title="Overall by Difficulty" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.think / s.attempts : 0).toFixed(1)}s avg think` }))} />
          <SimpleBreakdownCard title="Think Time" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.think / s.attempts : 0).toFixed(1)}s` }))} />
          <SimpleBreakdownCard title="Explanation Time" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.explanation / s.attempts : 0).toFixed(1)}s` }))} />
        </div>
      </SectionCard>

      <SectionCard
        title="Redemption System"
        subtitle="How retries are performing"
        icon={<Sparkles className="h-5 w-5 text-orange-500" />}
        className="border-orange-300/50 bg-orange-50/70 dark:bg-orange-950/20"
      >
        <MetricGrid>
          <Metric label="Redemption Attempts" value={`${redemptionAttempts.length}`} accent="orange" />
          <Metric label="Redemption Accuracy" value={`${(redemptionAttempts.length ? (redemptionCorrect / redemptionAttempts.length) * 100 : 0).toFixed(1)}%`} accent="orange" />
          <Metric label="Redemption Avg Think" value={`${(redemptionAttempts.length ? redemptionAttempts.reduce((s, a) => s + a.thinkTime, 0) / redemptionAttempts.length : 0).toFixed(1)}s`} accent="orange" />
        </MetricGrid>
      </SectionCard>

      <SessionLogCard sessions={sessions} onOpenSession={onOpenSession} />
    </div>
  );
}

function EventStats({ sessions, eventId, onOpenSession }: { sessions: SessionData[]; eventId: string; onOpenSession: (session: SessionData) => void }) {
  const attempts = sessions.flatMap((s) => s.attempts);
  const totalQuestions = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const incorrect = totalQuestions - correct;
  const totalThink = attempts.reduce((sum, a) => sum + a.thinkTime, 0);
  const totalExplanation = attempts.reduce((sum, a) => sum + a.explanationTime, 0);
  const avgTime = totalQuestions ? totalThink / totalQuestions : 0;
  const avgCorrectTime = correct ? attempts.filter((a) => a.isCorrect).reduce((s, a) => s + a.thinkTime, 0) / correct : 0;
  const avgWrongTime = incorrect ? attempts.filter((a) => !a.isCorrect).reduce((s, a) => s + a.thinkTime, 0) / incorrect : 0;

  const redemptionAttempts = attempts.filter((a) => a.isRedemption);
  const redemptionCorrect = redemptionAttempts.filter((a) => a.isCorrect).length;
  const category = groupByCategory(attempts);
  const sortedCategories = Object.entries(category)
    .map(([name, stats]) => ({
      name,
      accuracy: stats.attempts ? (stats.correct / stats.attempts) * 100 : 0,
      ...stats,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const bestCategory = sortedCategories[0]?.name ?? "N/A";
  const worstCategory = sortedCategories[sortedCategories.length - 1]?.name ?? "N/A";
  const difficulty = getDifficultyTimeSplits(attempts);
  const streak = getHighestStreak(attempts);
  const avgSessionLength = sessions.length ? sessions.reduce((s, session) => s + getSessionTotalTime(session), 0) / sessions.length : 0;

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 p-4">
        <h2 className="text-xl font-semibold">{getEventName(eventId)} Analytics</h2>
      </header>

      <SectionCard title="Performance Overview" subtitle="Core event metrics" icon={<Target className="h-5 w-5 text-primary" />}>
        <MetricGrid>
          <Metric label="Questions Answered" value={`${totalQuestions}`} accent="primary" />
          <Metric label="Accuracy" value={`${(totalQuestions ? (correct / totalQuestions) * 100 : 0).toFixed(1)}%`} accent="accent" />
          <Metric label="Avg Time" value={`${avgTime.toFixed(1)}s`} />
          <Metric label="Avg Time (Correct)" value={`${avgCorrectTime.toFixed(1)}s`} />
          <Metric label="Avg Time (Wrong)" value={`${avgWrongTime.toFixed(1)}s`} />
          <Metric label="Avg Session Length" value={formatDuration(avgSessionLength)} />
          <Metric label="Highest Streak" value={`${streak}`} />
        </MetricGrid>
      </SectionCard>

      <SectionCard title="Time Intelligence" subtitle="Think/explanation pacing" icon={<Orbit className="h-5 w-5 text-accent" />}>
        <MetricGrid>
          <Metric label="Avg Think Time" value={`${(totalQuestions ? totalThink / totalQuestions : 0).toFixed(1)}s`} />
          <Metric label="Avg Explanation Time" value={`${(totalQuestions ? totalExplanation / totalQuestions : 0).toFixed(1)}s`} />
          <Metric label="Think : Explanation Ratio" value={totalExplanation > 0 ? `${(totalThink / totalExplanation).toFixed(2)} : 1` : "N/A"} />
        </MetricGrid>
      </SectionCard>

      <SectionCard
        title="Redemption Stats"
        subtitle="Retry performance (highlighted)"
        icon={<Sparkles className="h-5 w-5 text-orange-500" />}
        className="border-orange-300/50 bg-orange-50/70 dark:bg-orange-950/20"
      >
        <MetricGrid>
          <Metric label="Redemption Attempts" value={`${redemptionAttempts.length}`} accent="orange" />
          <Metric label="Redemption Performance" value={`${(redemptionAttempts.length ? (redemptionCorrect / redemptionAttempts.length) * 100 : 0).toFixed(1)}%`} accent="orange" />
          <Metric label="Redemption Avg Think" value={`${(redemptionAttempts.length ? redemptionAttempts.reduce((s, a) => s + a.thinkTime, 0) / redemptionAttempts.length : 0).toFixed(1)}s`} accent="orange" />
        </MetricGrid>
      </SectionCard>

      <SectionCard title="Category Mastery" subtitle="Topic strengths and weaknesses" icon={<Medal className="h-5 w-5 text-primary" />}>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm mb-3">
          Best category: <strong>{bestCategory}</strong> • Worst category: <strong>{worstCategory}</strong>
        </div>
        <BreakdownRows rows={sortedCategories.map((cat) => ({ label: cat.name, value: `${cat.accuracy.toFixed(1)}% (${cat.correct}/${cat.attempts})` }))} />
      </SectionCard>

      <SectionCard title="Difficulty Breakdown" subtitle="Per-difficulty pacing" icon={<Flame className="h-5 w-5 text-chart-3" />}>
        <div className="grid gap-3 md:grid-cols-3">
          <SimpleBreakdownCard title="Overall by Difficulty" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.think / s.attempts : 0).toFixed(1)}s avg think` }))} />
          <SimpleBreakdownCard title="Think Time" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.think / s.attempts : 0).toFixed(1)}s` }))} />
          <SimpleBreakdownCard title="Explanation Time" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.explanation / s.attempts : 0).toFixed(1)}s` }))} />
        </div>
      </SectionCard>

      <SessionLogCard sessions={sessions} onOpenSession={onOpenSession} />
    </div>
  );
}

function SessionDetailModal({ session, onClose }: { session: SessionData; onClose: () => void }) {
  const breakdown = buildSessionBreakdown(session);
  const avgThinkTime = session.totalQuestions > 0 ? session.totalThinkTime / session.totalQuestions : 0;
  const avgExplanationTime = session.totalQuestions > 0 ? session.totalExplanationTime / session.totalQuestions : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="border-primary/25">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Session Detail</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{new Date(session.startTimestamp).toLocaleString()} • {getEventName(session.event)}</p>
              </div>
              <button className="text-sm underline" onClick={onClose}>Close</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Accuracy" value={`${session.accuracy.toFixed(1)}%`} compact />
              <Metric label="Total Questions" value={`${session.totalQuestions}`} compact />
              <Metric label="Total Think Time" value={formatDuration(session.totalThinkTime)} compact />
              <Metric label="Total Explanation Time" value={formatDuration(session.totalExplanationTime)} compact />
              <Metric label="Avg Think / Q" value={`${avgThinkTime.toFixed(1)}s`} compact />
              <Metric label="Avg Explanation / Q" value={`${avgExplanationTime.toFixed(1)}s`} compact />
            </div>

            <div>
              <h3 className="font-semibold mb-3">Question Timeline</h3>
              <QuestionTimelineChart attempts={session.attempts} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Metric label="Longest Correct Streak" value={`${breakdown.longestCorrectStreak}`} compact />
              <Metric label="Longest Incorrect Streak" value={`${breakdown.longestIncorrectStreak}`} compact />
              <Metric label="Hardest Topic" value={breakdown.hardestTopic} compact />
              <Metric label="Easiest Topic" value={breakdown.easiestTopic} compact />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function groupByEvent(sessions: SessionData[]) {
  const result: Record<string, { questions: number; correct: number; totalTime: number }> = {};
  sessions.forEach((session) => {
    if (!result[session.event]) result[session.event] = { questions: 0, correct: 0, totalTime: 0 };
    result[session.event].questions += session.attempts.length;
    result[session.event].correct += session.attempts.filter((a) => a.isCorrect).length;
    result[session.event].totalTime += getSessionTotalTime(session);
  });
  return result;
}

function groupByCategory(attempts: QuestionAttempt[]) {
  const result: Record<string, { attempts: number; correct: number }> = {};
  attempts.forEach((attempt) => {
    if (!result[attempt.category]) result[attempt.category] = { attempts: 0, correct: 0 };
    result[attempt.category].attempts += 1;
    if (attempt.isCorrect) result[attempt.category].correct += 1;
  });
  return result;
}

function getHighestStreak(attempts: QuestionAttempt[]) {
  let max = 0;
  let current = 0;
  attempts.forEach((attempt) => {
    if (attempt.isCorrect) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  });
  return max;
}

function SessionLogCard({ sessions, onOpenSession }: { sessions: SessionData[]; onOpenSession: (session: SessionData) => void }) {
  const rows = [...sessions]
    .sort((a, b) => (a.startTimestamp < b.startTimestamp ? 1 : -1))
    .slice(0, 10);

  return (
    <SectionCard title="Session Log" subtitle="Click any session for detailed timeline" icon={<Timer className="h-5 w-5 text-primary" />}>
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-4 gap-2 text-xs uppercase tracking-wide text-muted-foreground px-3">
          <span>Date</span><span>Questions</span><span>Accuracy</span><span>Time</span>
        </div>
        {rows.map((session) => (
          <button
            key={session.sessionId}
            onClick={() => onOpenSession(session)}
            className="w-full text-left grid grid-cols-4 gap-2 items-center rounded-lg border p-3 hover:bg-primary/10 hover:border-primary/40 transition-colors"
          >
            <span className="truncate">{new Date(session.startTimestamp).toLocaleString()}</span>
            <span>{session.totalQuestions} Q</span>
            <span>{session.accuracy.toFixed(1)}%</span>
            <span>{formatDuration(getSessionTotalTime(session))}</span>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

function SectionCard({ title, subtitle, children, icon, className }: { title: string; subtitle: string; children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <Card className={`border ${className ?? "bg-card/70"}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">{icon}{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BreakdownRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="space-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between border-b pb-2 last:border-0">
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function SimpleBreakdownCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl border bg-card/60 p-3">
      <h4 className="font-semibold mb-2 text-sm">{title}</h4>
      <BreakdownRows rows={rows} />
    </div>
  );
}

function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-4">{children}</div>;
}

function Metric({ label, value, accent, compact }: { label: string; value: string; accent?: "primary" | "accent" | "orange"; compact?: boolean }) {
  const accentClass =
    accent === "primary"
      ? "border-primary/30 bg-primary/5"
      : accent === "accent"
        ? "border-accent/30 bg-accent/5"
        : accent === "orange"
          ? "border-orange-300/60 bg-orange-100/70 dark:bg-orange-950/30"
          : "";

  if (compact) {
    return (
      <div className={`rounded-md border p-3 ${accentClass}`}>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold break-words">{value}</div>
      </div>
    );
  }

  return (
    <Card className={`${accentClass} border`}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold break-words">{value}</div>
      </CardContent>
    </Card>
  );
}
