"use client";

import { useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEventName } from "@/lib/events";
import { formatDuration, getDifficultyTimeSplits, getSessionTotalTime } from "@/lib/session-analytics";
import { storage, type QuestionAttempt, type SessionData } from "@/lib/storage";

export default function AnalyticsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AnalyticsContent />
      </SidebarInset>
    </SidebarProvider>
  );
}

function AnalyticsContent() {
  const [sessions, setSessions] = useState<SessionData[]>([]);

  useEffect(() => {
    setSessions(storage.getAllSessions());
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
      <h1 className="text-3xl font-bold">Analytics</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          {practicedEvents.map((eventId) => (
            <TabsTrigger key={eventId} value={eventId}>{getEventName(eventId)}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general"><GeneralStats sessions={sessions} /></TabsContent>
        {practicedEvents.map((eventId) => (
          <TabsContent key={eventId} value={eventId}><EventStats sessions={sessions.filter((s) => s.event === eventId)} eventId={eventId} /></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function GeneralStats({ sessions }: { sessions: SessionData[] }) {
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

  const events = groupByEvent(sessions);
  const sortedEvents = Object.entries(events).map(([eventId, stats]) => ({
    eventId,
    ...stats,
    accuracy: stats.questions ? (stats.correct / stats.questions) * 100 : 0,
  })).sort((a, b) => b.accuracy - a.accuracy);

  const bestEvent = sortedEvents[0];
  const worstEvent = sortedEvents[sortedEvents.length - 1];
  const mostTimeEvent = [...sortedEvents].sort((a, b) => b.totalTime - a.totalTime)[0];

  const difficulty = getDifficultyTimeSplits(attempts);
  const streak = getHighestStreak(attempts);
  const avgSessionLength = sessions.length ? sessions.reduce((s, session) => s + getSessionTotalTime(session), 0) / sessions.length : 0;

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Questions Answered" value={`${totalQuestions}`} />
        <Metric label="Accuracy" value={`${((correct / totalQuestions) * 100).toFixed(1)}%`} />
        <Metric label="Avg Time" value={`${avgTime.toFixed(1)}s`} />
        <Metric label="Avg Time (Correct)" value={`${avgCorrectTime.toFixed(1)}s`} />
        <Metric label="Avg Time (Wrong)" value={`${avgWrongTime.toFixed(1)}s`} />
        <Metric label="Events" value={`${sortedEvents.length}`} />
        <Metric label="Avg Session Length" value={formatDuration(avgSessionLength)} />
        <Metric label="Highest Streak" value={`${streak}`} />
        <Metric label="Total Time Practicing" value={formatDuration(totalTime)} />
        <Metric label="Avg Think Time" value={`${(totalQuestions ? totalThink / totalQuestions : 0).toFixed(1)}s`} />
        <Metric label="Avg Explanation Time" value={`${(totalQuestions ? totalExplanation / totalQuestions : 0).toFixed(1)}s`} />
        <Metric label="Think : Explanation Ratio" value={totalExplanation > 0 ? `${(totalThink / totalExplanation).toFixed(2)} : 1` : "N/A"} />
      </div>

      <Card><CardContent className="p-4 text-sm">Best event: <strong>{bestEvent ? getEventName(bestEvent.eventId) : "N/A"}</strong> • Worst event: <strong>{worstEvent ? getEventName(worstEvent.eventId) : "N/A"}</strong> • Event with most time spent: <strong>{mostTimeEvent ? getEventName(mostTimeEvent.eventId) : "N/A"}</strong></CardContent></Card>

      <BreakdownCard title="Performance by Event" rows={sortedEvents.map((event) => ({ label: getEventName(event.eventId), value: `${event.accuracy.toFixed(1)}% (${event.correct}/${event.questions})` }))} />
      <BreakdownCard title="Difficulty Breakdown" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${((s.attempts ? (s.think / s.attempts) : 0)).toFixed(1)}s avg think` }))} />
      <BreakdownCard title="Think Time by Difficulty" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.think / s.attempts : 0).toFixed(1)}s` }))} />
      <BreakdownCard title="Explanation Time by Difficulty" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.explanation / s.attempts : 0).toFixed(1)}s` }))} />
      <SessionLogCard sessions={sessions} />
    </div>
  );
}

function EventStats({ sessions, eventId }: { sessions: SessionData[]; eventId: string }) {
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
  const sortedCategories = Object.entries(category).map(([name, stats]) => ({
    name,
    accuracy: stats.attempts ? (stats.correct / stats.attempts) * 100 : 0,
    ...stats,
  })).sort((a, b) => b.accuracy - a.accuracy);

  const bestCategory = sortedCategories[0]?.name ?? "N/A";
  const worstCategory = sortedCategories[sortedCategories.length - 1]?.name ?? "N/A";

  const difficulty = getDifficultyTimeSplits(attempts);
  const streak = getHighestStreak(attempts);
  const avgSessionLength = sessions.length ? sessions.reduce((s, session) => s + getSessionTotalTime(session), 0) / sessions.length : 0;

  return (
    <div className="space-y-6 mt-4">
      <h2 className="text-xl font-semibold">{getEventName(eventId)}</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Questions Answered" value={`${totalQuestions}`} />
        <Metric label="Accuracy" value={`${(totalQuestions ? (correct / totalQuestions) * 100 : 0).toFixed(1)}%`} />
        <Metric label="Avg Time" value={`${avgTime.toFixed(1)}s`} />
        <Metric label="Avg Time (Correct)" value={`${avgCorrectTime.toFixed(1)}s`} />
        <Metric label="Avg Time (Wrong)" value={`${avgWrongTime.toFixed(1)}s`} />
        <Metric label="Redemption Attempts" value={`${redemptionAttempts.length}`} />
        <Metric label="Redemption Performance" value={`${(redemptionAttempts.length ? (redemptionCorrect / redemptionAttempts.length) * 100 : 0).toFixed(1)}%`} />
        <Metric label="Avg Session Length" value={formatDuration(avgSessionLength)} />
        <Metric label="Highest Streak" value={`${streak}`} />
        <Metric label="Best Category" value={bestCategory} />
        <Metric label="Worst Category" value={worstCategory} />
        <Metric label="Avg Think Time" value={`${(totalQuestions ? totalThink / totalQuestions : 0).toFixed(1)}s`} />
        <Metric label="Avg Explanation Time" value={`${(totalQuestions ? totalExplanation / totalQuestions : 0).toFixed(1)}s`} />
        <Metric label="Think : Explanation Ratio" value={totalExplanation > 0 ? `${(totalThink / totalExplanation).toFixed(2)} : 1` : "N/A"} />
      </div>

      <BreakdownCard title="Category Performance" rows={sortedCategories.map((cat) => ({ label: cat.name, value: `${cat.accuracy.toFixed(1)}% (${cat.correct}/${cat.attempts})` }))} />
      <BreakdownCard title="Difficulty Breakdown" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.think / s.attempts : 0).toFixed(1)}s avg think` }))} />
      <BreakdownCard title="Think Time by Difficulty" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.think / s.attempts : 0).toFixed(1)}s` }))} />
      <BreakdownCard title="Explanation Time by Difficulty" rows={Object.entries(difficulty).map(([d, s]) => ({ label: d, value: `${(s.attempts ? s.explanation / s.attempts : 0).toFixed(1)}s` }))} />
      <SessionLogCard sessions={sessions} />
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

function SessionLogCard({ sessions }: { sessions: SessionData[] }) {
  const rows = [...sessions]
    .sort((a, b) => (a.startTimestamp < b.startTimestamp ? 1 : -1))
    .slice(0, 10);

  return (
    <Card>
      <CardHeader><CardTitle>Session Log</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map((session) => (
          <div key={session.sessionId} className="flex items-center justify-between border-b pb-2">
            <span>{new Date(session.startTimestamp).toLocaleString()}</span>
            <span>{session.totalQuestions} Q</span>
            <span>{session.accuracy.toFixed(1)}%</span>
            <span>{formatDuration(getSessionTotalTime(session))}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="flex items-center justify-between border-b pb-2">
            <span>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold break-words">{value}</div>
      </CardContent>
    </Card>
  );
}
