"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminGuard } from "@/components/auth/admin-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type Analytics = {
  generatedAt: string;
  totalUsers: number;
  totalQuestions: number;
  questionsByEvent: Record<string, number>;
  questionsByDifficulty: Record<string, number>;
  activeUsersLast14Days: number;
  totalPracticeTimeSeconds: number;
  averagePracticeSessionDurationSeconds: number;
  mostPracticedEvent: { eventId: string; count: number } | null;
  leastPracticedEvent: { eventId: string; count: number } | null;
  accuracyByEvent: Record<string, { attempts: number; correct: number; accuracy: number }>;
  accuracyByDifficulty: Record<string, { attempts: number; correct: number; accuracy: number }>;
  eventPracticeCounts: Record<string, number>;
};

const STORAGE_KEY = "studyrx_auth_session";

function asDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export default function AdminSiteAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return (parsed?.idToken as string | undefined) || null;
  }, []);

  const load = async (refresh = false) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/site-analytics${refresh ? "?refresh=1" : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to load analytics");
      setData(body.analytics as Analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, []);

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider>
        <AdminGuard>
          <AppSidebar />
          <SidebarInset>
            <main className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">Site Analytics</h1>
                  <p className="text-sm text-muted-foreground">Platform-wide admin metrics. Personal analytics remain in /analytics.</p>
                </div>
                <Button variant="outline" onClick={() => void load(true)} disabled={loading}>Refresh</Button>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total users</p><p className="text-2xl font-bold">{data?.totalUsers ?? "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total questions</p><p className="text-2xl font-bold">{data?.totalQuestions ?? "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Active users (14d)</p><p className="text-2xl font-bold">{data?.activeUsersLast14Days ?? "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total practice time</p><p className="text-2xl font-bold">{data ? asDuration(data.totalPracticeTimeSeconds) : "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Avg session duration</p><p className="text-2xl font-bold">{data ? asDuration(data.averagePracticeSessionDurationSeconds) : "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Most practiced</p><p className="text-lg font-semibold">{data?.mostPracticedEvent ? `${data.mostPracticedEvent.eventId} (${data.mostPracticedEvent.count})` : "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Least practiced</p><p className="text-lg font-semibold">{data?.leastPracticedEvent ? `${data.leastPracticedEvent.eventId} (${data.leastPracticedEvent.count})` : "—"}</p></div>
                <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Generated</p><p className="text-sm font-medium">{data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "—"}</p></div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border">
                  <div className="border-b p-3 font-medium">Questions by event</div>
                  <div className="p-3 space-y-2 text-sm">
                    {Object.entries(data?.questionsByEvent || {}).map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between"><span>{key}</span><span className="font-semibold">{count}</span></div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border">
                  <div className="border-b p-3 font-medium">Questions by difficulty</div>
                  <div className="p-3 space-y-2 text-sm">
                    {Object.entries(data?.questionsByDifficulty || {}).map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between"><span>{key}</span><span className="font-semibold">{count}</span></div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border">
                  <div className="border-b p-3 font-medium">Accuracy by event</div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left"><th className="p-3">Event</th><th className="p-3">Attempts</th><th className="p-3">Accuracy</th></tr></thead>
                    <tbody>
                      {Object.entries(data?.accuracyByEvent || {}).map(([key, stats]) => (
                        <tr key={key} className="border-t"><td className="p-3">{key}</td><td className="p-3">{stats.attempts}</td><td className="p-3">{stats.accuracy.toFixed(1)}%</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg border">
                  <div className="border-b p-3 font-medium">Accuracy by difficulty</div>
                  <table className="w-full text-sm">
                    <thead><tr className="text-left"><th className="p-3">Difficulty</th><th className="p-3">Attempts</th><th className="p-3">Accuracy</th></tr></thead>
                    <tbody>
                      {Object.entries(data?.accuracyByDifficulty || {}).map(([key, stats]) => (
                        <tr key={key} className="border-t"><td className="p-3">{key}</td><td className="p-3">{stats.attempts}</td><td className="p-3">{stats.accuracy.toFixed(1)}%</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-lg border">
                <div className="border-b p-3 font-medium">Event practice counts</div>
                <div className="p-3 space-y-2 text-sm">
                  {Object.entries(data?.eventPracticeCounts || {}).map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between"><span>{key}</span><span className="font-semibold">{count}</span></div>
                  ))}
                </div>
              </section>
            </main>
          </SidebarInset>
        </AdminGuard>
      </SidebarProvider>
    </div>
  );
}
