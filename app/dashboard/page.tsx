"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Clock, Target, TrendingUp, Play, ExternalLink, BookOpen, Video, FolderOpen, Sparkles, Zap } from "lucide-react";
import { storage, type UserStats } from "@/lib/storage";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      const calculatedStats = await storage.calculateStats();
      setStats(calculatedStats);
      const sessions = await storage.getAllSessions();
      setTotalSessions(sessions.length);
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
            <main className="flex-1 p-6 space-y-6">
              <div className="rounded-2xl glass-card tech-border p-5 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Study Command Center</h2>
                <p className="text-sm text-muted-foreground mt-1">Track progress, launch practice quickly, and keep your prep streak alive.</p>
              </div>
            {/* Quick Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card hover:-translate-y-0.5 transition-transform">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Questions Attempted
                    </CardTitle>
                    <Target className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {stats?.totalAttempts || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total practice questions
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card hover:-translate-y-0.5 transition-transform">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Overall Accuracy
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {accuracy}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Correct answers rate
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card hover:-translate-y-0.5 transition-transform">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg. Time per Question
                    </CardTitle>
                    <Clock className="h-4 w-4 text-chart-3" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                      {avgTime}s
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: 30-45s per question
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card hover:-translate-y-0.5 transition-transform">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Sessions
                    </CardTitle>
                    <Brain className="h-4 w-4 text-chart-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">
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
                    <span className="font-semibold">{Math.min(Number(accuracy), 100).toFixed(1)} / 100%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${Math.min(Number(accuracy), 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: Consistent sessions with review can improve retention faster than long one-off runs.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card tech-border bg-gradient-to-br from-accent/10 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-accent" />
                    Quick Launch
                  </CardTitle>
                  <CardDescription>Jump into practice with one click.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3 flex-wrap">
                  <Button asChild variant="secondary">
                    <Link href="/events">Start Practice</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/analytics">Open Analytics</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

              {/* Start Practice CTA */}
              <Card className="border-border bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="text-foreground">Ready to Practice?</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {stats && stats.totalAttempts > 0
                      ? "Continue your HOSA preparation and improve your performance"
                      : "Choose an event to start practicing and tracking your progress"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="lg" className="font-semibold">
                    <Link href="/events">
                      <Play className="mr-2 h-4 w-4" />
                      Browse Events
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Resources Section */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Study Resources */}
                <Card className="border-border">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-foreground">Study Resources</CardTitle>
                    </div>
                    <CardDescription className="text-muted-foreground">
                      Essential materials for HOSA preparation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <a
                      href="https://hosa.org/competitive-events/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">HOSA Events Guide</p>
                          <p className="text-xs text-muted-foreground">Official competitive events</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>

                    <a
                      href="https://www.khanacademy.org/science/health-and-medicine"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Khan Academy</p>
                          <p className="text-xs text-muted-foreground">Health & medicine course</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>

                    <a
                      href="https://quizlet.com/subject/hosa/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Quizlet HOSA Sets</p>
                          <p className="text-xs text-muted-foreground">Flashcard study sets</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  </CardContent>
                </Card>

                {/* Video Resources */}
                <Card className="border-border">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-accent" />
                      <CardTitle className="text-foreground">Video Resources</CardTitle>
                    </div>
                    <CardDescription className="text-muted-foreground">
                      Educational videos for visual learning
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <a
                      href="https://www.youtube.com/@RegisteredNurseRN"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">RegisteredNurseRN</p>
                          <p className="text-xs text-muted-foreground">Medical education videos</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </a>

                    <a
                      href="https://www.youtube.com/@crashcourse"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">CrashCourse</p>
                          <p className="text-xs text-muted-foreground">Anatomy & physiology</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </a>

                    <a
                      href="https://www.youtube.com/@ArmandoHasudungan"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Armando Hasudungan</p>
                          <p className="text-xs text-muted-foreground">Medical illustrations</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </a>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Tips */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">HOSA Practice Tips</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Maximize your competitive event preparation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                        <span className="text-sm font-bold text-primary">1</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          Multiple Events
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Practice different HOSA events to find your strengths and interests
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 flex-shrink-0">
                        <span className="text-sm font-bold text-accent">2</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          Track Progress
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Use analytics to monitor per-event performance and identify areas for improvement
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-3/10 flex-shrink-0">
                        <span className="text-sm font-bold text-chart-3">3</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">
                          Master Terminology
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Start with medical terminology as it builds foundation for other events
                        </p>
                      </div>
                    </div>
                  </div>
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
