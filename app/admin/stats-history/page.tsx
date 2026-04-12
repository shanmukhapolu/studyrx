"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminGuard } from "@/components/auth/admin-guard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rtdbGet } from "@/lib/rtdb";
import { toOrderedSnapshots, type SitewideStatsSnapshot, type SitewideStatsHistoryByDate } from "@/lib/sitewide-stats-history";

function dateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function AdminStatsHistoryPage() {
  return (
    <SidebarProvider>
      <AuthGuard>
        <AdminGuard>
          <AppSidebar />
          <SidebarInset>
            <StatsHistoryContent />
          </SidebarInset>
        </AdminGuard>
      </AuthGuard>
    </SidebarProvider>
  );
}

function StatsHistoryContent() {
  const [history, setHistory] = useState<SitewideStatsHistoryByDate>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await rtdbGet<SitewideStatsHistoryByDate>("admin_stats/sitewide_history/daily", {});
        setHistory(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => window.clearInterval(interval);
  }, []);

  const snapshots = useMemo(() => toOrderedSnapshots(history), [history]);
  const eventRows = useMemo(
    () => snapshots.flatMap((snapshot) =>
      Object.entries(snapshot.stats.contentAnalytics.perEventStats).map(([eventName, stats]) => ({
        dateKey: snapshot.dateKey,
        timestamp: snapshot.timestamp,
        eventName,
        stats,
      }))
    ),
    [snapshots]
  );
  const availableEvents = useMemo(
    () => Array.from(new Set(eventRows.map((row) => row.eventName))).sort((a, b) => a.localeCompare(b)),
    [eventRows]
  );
  const [selectedEvent, setSelectedEvent] = useState<string>("");

  useEffect(() => {
    if (availableEvents.length === 0) {
      setSelectedEvent("");
      return;
    }
    if (!selectedEvent || !availableEvents.includes(selectedEvent)) {
      setSelectedEvent(availableEvents[0]);
    }
  }, [availableEvents, selectedEvent]);

  const selectedEventRows = useMemo(
    () => eventRows.filter((row) => row.eventName === selectedEvent),
    [eventRows, selectedEvent]
  );

  return (
    <div className="flex-1 overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Sitewide Stats History</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">Back to Admin Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Snapshot Spreadsheet</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading history...</p>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet. Open the Sitewide Stats tab to trigger initial backfill + daily snapshot sync.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[1800px] text-xs">
                <thead className="bg-muted/40 text-left">
                  <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:font-medium whitespace-nowrap">
                    <th>Date Key</th>
                    <th>Snapshot Timestamp</th>
                    <th>Total Users</th>
                    <th>Growth Rate %</th>
                    <th>Total Sessions</th>
                    <th>Avg Questions / Session</th>
                    <th>Avg Time / Session (s)</th>
                    <th>Total Time Practicing (s)</th>
                    <th>Total Time Reviewing (s)</th>
                    <th>Return After First Session %</th>
                    <th>Overall Accuracy %</th>
                    <th>Redemption Accuracy %</th>
                    <th>Avg Improvement %</th>
                    <th>Total Questions Attempted</th>
                    <th>Users With ≥2 Sessions %</th>
                    <th>Users With ≥5 Sessions %</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snapshot: SitewideStatsSnapshot) => (
                    <tr key={snapshot.dateKey} className="border-t [&>td]:px-2 [&>td]:py-2 whitespace-nowrap">
                      <td className="font-medium">{snapshot.dateKey}</td>
                      <td>{dateLabel(snapshot.timestamp)}</td>
                      <td>{snapshot.stats.adoption.totalUsers}</td>
                      <td>{snapshot.stats.adoption.growthRateWeekOverWeek}</td>
                      <td>{snapshot.stats.engagement.totalSessionsCompleted}</td>
                      <td>{snapshot.stats.engagement.avgQuestionsPerSession}</td>
                      <td>{snapshot.stats.engagement.avgTimePerSessionSeconds}</td>
                      <td>{snapshot.stats.engagement.totalThinkTimeSeconds}</td>
                      <td>{snapshot.stats.engagement.totalExplanationTimeSeconds}</td>
                      <td>{snapshot.stats.engagement.retentionAfterFirstSessionPct}</td>
                      <td>{snapshot.stats.learningEffectiveness.overallAverageAccuracyPct}</td>
                      <td>{snapshot.stats.learningEffectiveness.redemptionRoundAvgAccuracyPct}</td>
                      <td>{snapshot.stats.learningEffectiveness.avgImprovementFirstToLastSameEventPct}</td>
                      <td>{snapshot.stats.contentAnalytics.totalQuestionsAttempted}</td>
                      <td>{snapshot.stats.retention.usersWithAtLeast2SessionsPct}</td>
                      <td>{snapshot.stats.retention.usersWithAtLeast5SessionsPct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-Event Snapshot Rows</CardTitle>
        </CardHeader>
        <CardContent>
          {eventRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No event rows available yet.</p>
          ) : (
            <Tabs value={selectedEvent} onValueChange={setSelectedEvent}>
              <div className="mb-3 overflow-x-auto pb-1">
                <TabsList className="inline-flex h-auto min-w-max">
                  {availableEvents.map((eventName) => (
                    <TabsTrigger key={eventName} value={eventName} className="text-xs">
                      {eventName}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[860px] text-xs">
                  <thead className="bg-muted/40 text-left">
                    <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:font-medium whitespace-nowrap">
                      <th>Date Key</th>
                      <th>Snapshot Timestamp</th>
                      <th>Accuracy %</th>
                      <th>Questions Attempted</th>
                      <th>Users</th>
                      <th>Practice Time (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEventRows.map((row) => (
                      <tr key={`${row.dateKey}-${row.eventName}`} className="border-t [&>td]:px-2 [&>td]:py-2 whitespace-nowrap">
                        <td className="font-medium">{row.dateKey}</td>
                        <td>{dateLabel(row.timestamp)}</td>
                        <td>{row.stats.accuracyPct}</td>
                        <td>{row.stats.questionsAttempted}</td>
                        <td>{row.stats.usersCount}</td>
                        <td>{row.stats.practiceTimeSeconds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
