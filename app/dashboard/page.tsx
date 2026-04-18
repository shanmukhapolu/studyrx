"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Clock, Target, TrendingUp, ExternalLink, Sparkles, Zap } from "lucide-react";
import { DEFAULT_USER_SETTINGS, storage, type UserSettings, type UserStats } from "@/lib/storage";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  useEffect(() => {
    const loadStats = async () => {
      const calculatedStats = await storage.calculateStats();
      setStats(calculatedStats);
      const sessions = await storage.getAllSessions();
      setTotalSessions(sessions.length);
      const loadedSettings = await storage.getSettings();
      setSettings(loadedSettings);
    };

    loadStats();

    const handleStorage = () => {
      loadStats();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const accuracy = stats && stats.totalAttempts > 0
    ? ((stats.correctAnswers / stats.totalAttempts) * 100).toFixed(1)
    : "0";

  const avgTime = stats?.averageTime
    ? stats.averageTime.toFixed(1)
    : "0";

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider>
        <AuthGuard>
          <AppSidebar />
          <SidebarInset>
          <div className="flex flex-col flex-1">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-16 items-center gap-4 px-6">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                  <p className="text-sm text-muted-foreground">
                    Hi {profile?.firstName || "there"}, how&apos;s it going? Your practice overview and resources.
                  </p>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-5 space-y-5">
              <div className="rounded-xl glass-card tech-border p-5 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Study Command Center</h2>
                <p className="text-sm text-muted-foreground mt-1">Track progress, launch practice quickly, and keep your prep streak alive.</p>
              </div>
            {/* Quick Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Questions Attempted
                    </CardTitle>
                    <Target className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-foreground">
                      {stats?.totalAttempts || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total practice questions
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Overall Accuracy
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-foreground">
                      {accuracy}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Correct answers rate
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg. Time per Question
                    </CardTitle>
                    <Clock className="h-4 w-4 text-chart-3" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-foreground">
                      {avgTime}s
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: 30-45s per question
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Sessions
                    </CardTitle>
                    <Brain className="h-4 w-4 text-chart-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-foreground">
                      {totalSessions}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed practice sessions
                    </p>
                  </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="glass-card tech-border bg-gradient-to-br from-primary/10 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Momentum Meter
                  </CardTitle>
                  <CardDescription>How close you are to your next milestone.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy Goal</span>
                    <span className="font-semibold">{Math.min(Number(accuracy), 100).toFixed(1)} / {settings.accuracyGoal}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${Math.min((Number(accuracy) / settings.accuracyGoal) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: Consistent sessions with review can improve retention faster than long one-off runs.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card tech-border bg-gradient-to-br from-accent/10 to-transparent h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-accent" />
                    Quick Launch
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3 flex-wrap pt-0">
                  <Button asChild variant="secondary">
                    <Link href="/events">Start Practice</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/analytics">Open Analytics</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

              <Card className="border-border bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="text-foreground">Need a game plan?</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Not sure where to start? Browse all events, then review the official guidelines before practicing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/events">Browse Events</Link>
                  </Button>
                  <Button asChild size="sm">
                    <a href="https://hosa.org/competitive-events/" target="_blank" rel="noopener noreferrer">
                      HOSA Guidelines
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
          </SidebarInset>
        </AuthGuard>
      </SidebarProvider>
    </div>
  );
}
