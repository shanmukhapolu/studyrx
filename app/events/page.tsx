"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { storage } from "@/lib/storage";
import { HOSA_EVENTS } from "@/lib/events";
import { Play, TrendingUp } from "lucide-react";

export default function EventsPage() {
  return (
    <SidebarProvider>
      <AuthGuard>
        <AppSidebar />
        <SidebarInset>
          <EventsContent />
        </SidebarInset>
      </AuthGuard>
    </SidebarProvider>
  );
}

function EventsContent() {
  const [eventStats, setEventStats] = useState<Record<string, { attempted: number; accuracy: number }>>({});

  useEffect(() => {
    const loadEventStats = async () => {
      const sessions = await storage.getAllSessions();
      const stats: Record<string, { correct: number; total: number }> = {};

      sessions.forEach((session) => {
        session.attempts.forEach((attempt) => {
          const attemptEventId = attempt.eventId || session.event || "unknown";
          if (!stats[attemptEventId]) {
            stats[attemptEventId] = { correct: 0, total: 0 };
          }
          stats[attemptEventId].total++;
          if (attempt.isCorrect) {
            stats[attemptEventId].correct++;
          }
        });
      });

      const formattedStats: Record<string, { attempted: number; accuracy: number }> = {};
      Object.entries(stats).forEach(([attemptEventId, data]) => {
        formattedStats[attemptEventId] = {
          attempted: data.total,
          accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        };
      });

      setEventStats(formattedStats);
    };

    loadEventStats();
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">HOSA Competitive Events</h1>
            <p className="text-muted-foreground mt-1 font-light">
              Choose an event to start practicing
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {HOSA_EVENTS.map((event) => {
            const stats = eventStats[event.id];
            const Icon = event.icon;
            
            return (
              <Card key={event.id} className="border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    {stats && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                        <div className="text-lg font-bold font-mono text-accent">
                          {stats.accuracy.toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl">{event.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>{stats.attempted} questions practiced</span>
                      </div>
                    )}
                    <Button asChild className="w-full font-semibold" size="lg">
                      <Link href={`/practice/${event.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Practice Now
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-lg">Practice Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Start with Basics</h4>
                  <p className="text-muted-foreground">
                    Begin with Medical Terminology to build a strong foundation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 flex-shrink-0">
                  <span className="text-sm font-bold text-accent">2</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Practice Regularly</h4>
                  <p className="text-muted-foreground">
                    Consistent daily practice yields the best results
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-3/10 flex-shrink-0">
                  <span className="text-sm font-bold text-chart-3">3</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Track Progress</h4>
                  <p className="text-muted-foreground">
                    Use analytics to identify areas needing improvement
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
