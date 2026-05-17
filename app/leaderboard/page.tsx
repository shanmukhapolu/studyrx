"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, LockKeyhole, Medal, Trophy, UserRound } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildLeaderboardUserRecord,
  buildLeaderboardView,
  getLeaderboardUsers,
  getMetricValue,
  LEADERBOARD_METRICS,
  LEADERBOARD_MIN_QUESTIONS,
  OVERALL_EVENT_ID,
  PUBLISHED_LEADERBOARD_EVENTS,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardUserRecord,
} from "@/lib/leaderboard";
import { getEventName } from "@/lib/events";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";

const metricCopy: Record<LeaderboardMetric, { noun: string; rankedIn: string }> = {
  accuracy: { noun: "accuracy", rankedIn: "accuracy" },
  questionsAnswered: { noun: "answering questions", rankedIn: "questions answered" },
  longestStreak: { noun: "longest streak", rankedIn: "longest streak" },
};

function medalForRank(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function LeaderboardRows({
  rows,
  metric,
  currentUserId,
}: {
  rows: LeaderboardEntry[];
  metric: LeaderboardMetric;
  currentUserId?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No ranked students yet. Answer at least {LEADERBOARD_MIN_QUESTIONS} questions to join this leaderboard.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/70">
      {rows.map((entry) => {
        const isCurrentUser = currentUserId === entry.uid;
        const medal = medalForRank(entry.rank);

        return (
          <div
            key={`${entry.uid}-${entry.rank}`}
            className={cn(
              "grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border/70 px-4 py-3 last:border-b-0",
              isCurrentUser && "bg-primary/10 ring-1 ring-inset ring-primary/30"
            )}
          >
            <div className="flex w-10 items-center justify-center text-sm font-bold text-muted-foreground">
              {medal ? <span className="text-xl" aria-label={`Rank ${entry.rank}`}>{medal}</span> : `#${entry.rank}`}
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {entry.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {entry.displayName}{isCurrentUser ? " (You)" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.questionsAnswered.toLocaleString()} questions • {entry.accuracy.toFixed(1)}% accuracy • {entry.longestStreak} streak
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{getMetricValue(entry, metric)}</p>
              <p className="text-xs text-muted-foreground">{metricCopy[metric].rankedIn}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/logo.png" alt="StudyRx" width={26} height={26} className="h-6.5 w-6.5" />
          <span className="font-heading text-base font-semibold text-foreground">StudyRx</span>
        </Link>
        <div className="flex items-center gap-2.5">
          <Button asChild variant="ghost" size="sm" className="text-sm">
            <Link href="/auth/signin">Log in</Link>
          </Button>
          <Button asChild size="sm" className="text-sm">
            <Link href="/auth/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function PublicLeaderboard({ records, loading }: { records: Record<string, LeaderboardUserRecord>; loading: boolean }) {
  const view = useMemo(
    () => buildLeaderboardView(records, { eventId: OVERALL_EVENT_ID, metric: "accuracy", topLimit: 5 }),
    [records]
  );

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Climb the charts. Master your event.</h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">See the top StudyRx performers by overall accuracy across published HOSA events.</p>
        </div>

        <Card className="glass-card w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Medal className="h-5 w-5 text-primary" /> Top 5 Overall Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}
              </div>
            ) : view.top.length > 0 ? (
              <div className="relative">
                <LeaderboardRows rows={view.top} metric="accuracy" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/85 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-border bg-background/95 p-4 text-center shadow-sm backdrop-blur">
                  <LockKeyhole className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Create an account or log in to see the rest.</p>
                  <div className="mt-3 flex justify-center gap-2">
                    <Button asChild size="sm"><Link href="/auth/signup">Sign up</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link href="/auth/signin">Log in</Link></Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <LeaderboardRows rows={view.top} metric="accuracy" />
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                  <p className="text-sm font-semibold text-foreground">Want to be first on the board?</p>
                  <div className="mt-3 flex justify-center gap-2">
                    <Button asChild size="sm"><Link href="/auth/signup">Sign up</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link href="/auth/signin">Log in</Link></Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function AuthenticatedLeaderboard({ records, loading }: { records: Record<string, LeaderboardUserRecord>; loading: boolean }) {
  const { user } = useAuth();
  const [eventId, setEventId] = useState(OVERALL_EVENT_ID);
  const [metric, setMetric] = useState<LeaderboardMetric>("accuracy");

  const view = useMemo(
    () => buildLeaderboardView(records, { eventId, metric, currentUserId: user?.uid, topLimit: 10 }),
    [eventId, metric, records, user?.uid]
  );

  const eventName = eventId === OVERALL_EVENT_ID ? "all published events" : getEventName(eventId);
  const userRankCopy = view.currentUser
    ? `You're ranked #${view.currentUser.rank} in ${metricCopy[metric].noun} for ${eventName}.`
    : `Answer at least ${LEADERBOARD_MIN_QUESTIONS} questions ${eventId === OVERALL_EVENT_ID ? "overall" : `in ${eventName}`} to be ranked.`;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-background">
          <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-3 px-4 md:gap-4 md:px-6">
              <SidebarTrigger className="md:hidden" />
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground md:text-2xl">Leaderboard</h1>
                <p className="text-sm text-muted-foreground">{userRankCopy}</p>
              </div>
            </div>
          </header>

          <main className="flex-1 space-y-6 p-4 md:p-6">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="space-y-2 text-sm font-medium">
                  <span>Leaderboard</span>
                  <select
                    value={eventId}
                    onChange={(event) => setEventId(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value={OVERALL_EVENT_ID}>All published events</option>
                    {PUBLISHED_LEADERBOARD_EVENTS.map((event) => (
                      <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                  </select>
                </label>

                <Tabs value={metric} onValueChange={(value) => setMetric(value as LeaderboardMetric)}>
                  <TabsList className="grid h-auto grid-cols-1 gap-1 sm:grid-cols-3">
                    {LEADERBOARD_METRICS.map((item) => (
                      <TabsTrigger key={item.id} value={item.id} className="px-4 py-2">
                        {item.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {view.currentUser && (
                <div className="grid gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Your rank</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">#{view.currentUser.rank}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Current metric</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{getMetricValue(view.currentUser, metric)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Ranked students</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{view.totalRanked.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Top 10</CardTitle>
                  <CardDescription>{LEADERBOARD_METRICS.find((item) => item.id === metric)?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">{Array.from({ length: 10 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
                  ) : (
                    <LeaderboardRows rows={view.top} metric={metric} currentUserId={user?.uid} />
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" /> Your position</CardTitle>
                  <CardDescription>
                    {view.nearby.length > 0 ? "One place above you, you, and one place below you." : "Shown only when you are outside the top 10."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {view.nearby.length > 0 ? (
                    <LeaderboardRows rows={view.nearby} metric={metric} currentUserId={user?.uid} />
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                      {view.currentUser && view.currentUser.rank <= 10
                        ? "You're already highlighted in the top 10. Keep climbing!"
                        : `You are not ranked here yet. Complete at least ${LEADERBOARD_MIN_QUESTIONS} questions to appear.`}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function LeaderboardPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<Record<string, LeaderboardUserRecord>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const users = await getLeaderboardUsers();
      if (user?.uid) {
        const sessions = await storage.getAllSessions();
        const rawName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || user.displayName || user.email;
        users[user.uid] = buildLeaderboardUserRecord(user.uid, rawName, sessions);
      }
      if (!cancelled) {
        setRecords(users);
        setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [profile?.firstName, profile?.lastName, user?.displayName, user?.email, user?.uid]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4 animate-pulse text-primary" /> Loading leaderboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return <PublicLeaderboard records={records} loading={loading} />;
  }

  return <AuthenticatedLeaderboard records={records} loading={loading} />;
}
