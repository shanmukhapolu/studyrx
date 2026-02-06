"use client";

import { useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { QuestionTimelineChart } from "@/components/question-timeline-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEventName } from "@/lib/events";
import { buildSessionBreakdown, formatDuration, getSessionTotalTime } from "@/lib/session-analytics";
import { storage, type SessionData } from "@/lib/storage";

export default function SessionsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SessionLogContent />
      </SidebarInset>
    </SidebarProvider>
  );
}

function SessionLogContent() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    setSessions(storage.getAllSessions().sort((a, b) => (a.startTimestamp < b.startTimestamp ? 1 : -1)));
  }, []);

  const eventIds = useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach((session) => ids.add(session.event));
    return Array.from(ids);
  }, [sessions]);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Session Logs</h1>
        <p className="text-sm text-muted-foreground">Review completed practice and timed sessions by event.</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Events</TabsTrigger>
          {eventIds.map((eventId) => (
            <TabsTrigger key={eventId} value={eventId}>{getEventName(eventId)}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <SessionTable sessions={sessions} onSelect={setSelectedSession} />
        </TabsContent>

        {eventIds.map((eventId) => (
          <TabsContent key={eventId} value={eventId}>
            <SessionTable sessions={sessions.filter((session) => session.event === eventId)} onSelect={setSelectedSession} />
          </TabsContent>
        ))}
      </Tabs>

      {selectedSession && <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  );
}

function SessionTable({ sessions, onSelect }: { sessions: SessionData[]; onSelect: (session: SessionData) => void }) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">No sessions in this event yet.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Past Sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="hidden md:grid md:grid-cols-6 gap-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
          <span>Date & Time</span>
          <span>Event</span>
          <span>Session Type</span>
          <span>Accuracy</span>
          <span>Questions</span>
          <span>Total Time</span>
        </div>
        {sessions.map((session) => (
          <button
            key={session.sessionId}
            className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            onClick={() => onSelect(session)}
          >
            <div className="grid gap-2 md:grid-cols-6 text-sm">
              <div>{new Date(session.startTimestamp).toLocaleString()}</div>
              <div>{getEventName(session.event)}</div>
              <div className="capitalize">{session.sessionType}</div>
              <div>{session.accuracy.toFixed(1)}%</div>
              <div>{session.totalQuestions}</div>
              <div>{formatDuration(getSessionTotalTime(session))}</div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function SessionDetailModal({ session, onClose }: { session: SessionData; onClose: () => void }) {
  const breakdown = buildSessionBreakdown(session);
  const avgThinkTime = session.totalQuestions > 0 ? session.totalThinkTime / session.totalQuestions : 0;
  const avgExplanationTime = session.totalQuestions > 0 ? session.totalExplanationTime / session.totalQuestions : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm overflow-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Session Detail</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{new Date(session.startTimestamp).toLocaleString()} • {getEventName(session.event)}</p>
              </div>
              <button className="text-sm underline" onClick={onClose}>Close</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <Stat label="Accuracy" value={`${session.accuracy.toFixed(1)}%`} />
              <Stat label="Total Questions" value={`${session.totalQuestions}`} />
              <Stat label="Total Think Time" value={formatDuration(session.totalThinkTime)} />
              <Stat label="Total Explanation Time" value={formatDuration(session.totalExplanationTime)} />
              <Stat label="Avg Think / Q" value={`${avgThinkTime.toFixed(1)}s`} />
              <Stat label="Avg Explanation / Q" value={`${avgExplanationTime.toFixed(1)}s`} />
            </div>

            <div>
              <h3 className="font-semibold mb-3">Question Timeline</h3>
              <QuestionTimelineChart attempts={session.attempts} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Stat label="Longest Correct Streak" value={`${breakdown.longestCorrectStreak}`} />
              <Stat label="Longest Incorrect Streak" value={`${breakdown.longestIncorrectStreak}`} />
              <Stat label="Hardest Topic" value={breakdown.hardestTopic} />
              <Stat label="Easiest Topic" value={breakdown.easiestTopic} />
            </div>

            <div>
              <h3 className="font-semibold mb-3">Avg Think Time by Difficulty</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(breakdown.avgThinkByDifficulty).map(([difficulty, time]) => (
                  <span key={difficulty} className="inline-flex rounded-full border px-3 py-1 text-xs">{difficulty}: {time.toFixed(1)}s</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
