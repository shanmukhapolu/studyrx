"use client";

import { useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEventName } from "@/lib/events";
import { getDifficultyTimeSplits } from "@/lib/session-analytics";
import { storage, type SessionData } from "@/lib/storage";

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

        <TabsContent value="general">
          <GlobalThinkExplanation sessions={sessions} />
        </TabsContent>

        {practicedEvents.map((eventId) => (
          <TabsContent key={eventId} value={eventId}>
            <GlobalThinkExplanation sessions={sessions.filter((s) => s.event === eventId)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function GlobalThinkExplanation({ sessions }: { sessions: SessionData[] }) {
  const attempts = sessions.flatMap((session) => session.attempts);
  const totalThink = attempts.reduce((sum, attempt) => sum + attempt.thinkTime, 0);
  const totalExplanation = attempts.reduce((sum, attempt) => sum + attempt.explanationTime, 0);
  const avgThink = attempts.length > 0 ? totalThink / attempts.length : 0;
  const avgExplanation = attempts.length > 0 ? totalExplanation / attempts.length : 0;
  const ratio = totalExplanation > 0 ? totalThink / totalExplanation : 0;

  const difficultySplits = getDifficultyTimeSplits(attempts);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Avg Think Time (overall)" value={`${avgThink.toFixed(1)}s`} />
        <Metric label="Avg Explanation Time (overall)" value={`${avgExplanation.toFixed(1)}s`} />
        <Metric label="Think : Explanation Ratio" value={ratio > 0 ? `${ratio.toFixed(2)} : 1` : "N/A"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Think Time by Difficulty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(difficultySplits).map(([difficulty, split]) => (
            <div key={`think-${difficulty}`} className="flex justify-between text-sm">
              <span>{difficulty}</span>
              <span>{split.attempts > 0 ? (split.think / split.attempts).toFixed(1) : "0.0"}s</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Explanation Time by Difficulty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(difficultySplits).map(([difficulty, split]) => (
            <div key={`explanation-${difficulty}`} className="flex justify-between text-sm">
              <span>{difficulty}</span>
              <span>{split.attempts > 0 ? (split.explanation / split.attempts).toFixed(1) : "0.0"}s</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
