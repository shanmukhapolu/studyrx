"use client";

import Link from "next/link";
import { SessionData } from "@/lib/storage";
import { Button } from "@/components/ui/button";

const formatDuration = (seconds: number) => {
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

interface SessionLogListProps {
  sessions: SessionData[];
  eventId?: string;
}

export function SessionLogList({ sessions, eventId }: SessionLogListProps) {
  const filteredSessions = sessions
    .filter((session) => (eventId ? session.eventId === eventId : true))
    .sort(
      (a, b) =>
        new Date(b.startTimestamp).getTime() - new Date(a.startTimestamp).getTime()
    );

  if (filteredSessions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No completed sessions yet. Finish a practice run to see it here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:grid grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-4 text-xs text-muted-foreground uppercase tracking-wide font-semibold px-2">
        <span>Date & Time</span>
        <span>Event</span>
        <span>Type</span>
        <span>Accuracy</span>
        <span>Questions</span>
        <span>Total Time</span>
      </div>
      {filteredSessions.map((session) => {
        const totalTime = session.totalThinkTime + session.totalExplanationTime;
        return (
          <div
            key={session.sessionId}
            className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.8fr_0.6fr] gap-4 items-center rounded-xl border border-border bg-muted/30 px-4 py-4"
          >
            <div>
              <div className="text-sm font-semibold">
                {formatDate(session.startTimestamp)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTime(session.startTimestamp)}
              </div>
            </div>
            <div className="text-sm font-medium">{session.eventName}</div>
            <div className="text-sm capitalize">{session.sessionType}</div>
            <div className="text-sm font-mono">{session.accuracy.toFixed(1)}%</div>
            <div className="text-sm">{session.totalQuestions}</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono">{formatDuration(totalTime)}</span>
              <Button asChild variant="outline" size="sm" className="ml-2 bg-transparent">
                <Link href={`/sessions/${session.sessionId}`}>Details</Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
