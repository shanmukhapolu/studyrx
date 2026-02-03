"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { storage, type SessionData, type UserStats } from "@/lib/storage";
import { getEventName } from "@/lib/events";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Award,
  AlertCircle,
  Trophy,
  Zap,
} from "lucide-react";

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [practicedEvents, setPracticedEvents] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allSessions = storage.getAllSessions();
    setSessions(allSessions);
    
    const events = storage.getPracticedEvents();
    setPracticedEvents(events);
  };

  const handleReset = () => {
    storage.resetAllData();
    loadData();
    setShowConfirm(false);
  };

  // Calculate overall stats
  const allAttempts = sessions.flatMap((s) => s.attempts);
  const totalAttempts = allAttempts.length;

  return (
    <div className="flex-1 overflow-auto">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
              <p className="text-muted-foreground mt-1 font-light">Deep insights into your performance</p>
            </div>
            <Button
              onClick={() => setShowConfirm(true)}
              variant="outline"
              size="sm"
              className="bg-transparent"
            >
              Reset Stats
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8 max-w-7xl">
        {totalAttempts === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
              <p className="text-muted-foreground">
                Complete some practice sessions to see your analytics
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              {practicedEvents.map(eventId => (
                <TabsTrigger key={eventId} value={eventId}>
                  {getEventName(eventId)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general">
              <GeneralStats sessions={sessions} />
            </TabsContent>

            {practicedEvents.map(eventId => (
              <TabsContent key={eventId} value={eventId}>
                <EventStats eventId={eventId} sessions={sessions} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Reset Confirmation Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Reset All Statistics?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  This will permanently delete all your practice sessions and progress. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleReset}
                    className="flex-1"
                  >
                    Reset Everything
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function GeneralStats({ sessions }: { sessions: SessionData[] }) {
  const allAttempts = sessions.flatMap((s) => s.attempts);
  const totalAttempts = allAttempts.length;
  const correctAttempts = allAttempts.filter((a) => a.correct).length;
  const overallAccuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
  const totalTime = allAttempts.reduce((sum, a) => a.timeSpent, 0);
  const averageTime = totalAttempts > 0 ? totalTime / totalAttempts : 0;

  // Calculate per-event accuracy
  const eventStats: Record<string, { correct: number; total: number }> = {};
  allAttempts.forEach(attempt => {
    const eventId = attempt.eventId || "unknown";
    if (!eventStats[eventId]) {
      eventStats[eventId] = { correct: 0, total: 0 };
    }
    eventStats[eventId].total++;
    if (attempt.correct) {
      eventStats[eventId].correct++;
    }
  });

  const eventAccuracies = Object.entries(eventStats).map(([eventId, stats]) => ({
    eventId,
    eventName: getEventName(eventId),
    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    total: stats.total
  })).sort((a, b) => b.accuracy - a.accuracy);

  const bestEvent = eventAccuracies[0];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Total Questions</span>
            </div>
            <div className="text-3xl font-bold font-mono">{totalAttempts}</div>
            <div className="text-xs text-muted-foreground mt-1">Across all events</div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Overall Accuracy</span>
            </div>
            <div className="text-3xl font-bold font-mono">{overallAccuracy.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{correctAttempts} correct answers</div>
          </CardContent>
        </Card>

        <Card className="border-chart-3/20 bg-gradient-to-br from-chart-3/5 to-chart-3/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-chart-3" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Avg Time</span>
            </div>
            <div className="text-3xl font-bold font-mono">{averageTime.toFixed(1)}s</div>
            <div className="text-xs text-muted-foreground mt-1">Per question</div>
          </CardContent>
        </Card>

        <Card className="border-chart-4/20 bg-gradient-to-br from-chart-4/5 to-chart-4/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-4/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-chart-4" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Events Practiced</span>
            </div>
            <div className="text-3xl font-bold font-mono">{Object.keys(eventStats).length}</div>
            <div className="text-xs text-muted-foreground mt-1">{sessions.length} total sessions</div>
          </CardContent>
        </Card>
      </div>

      {/* Best Event */}
      {bestEvent && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Best Performing Event</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Your strongest area</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">{bestEvent.eventName}</h3>
                <div className="text-3xl font-bold font-mono text-primary">{bestEvent.accuracy.toFixed(1)}%</div>
              </div>
              <p className="text-sm text-muted-foreground">
                {bestEvent.total} questions practiced with {eventStats[bestEvent.eventId].correct} correct answers
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Performance Breakdown */}
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <div>
              <CardTitle className="text-2xl">Performance by Event</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Accuracy across all practiced events</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {eventAccuracies.map((event) => (
            <div key={event.eventId} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg">{event.eventName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {eventStats[event.eventId].correct} / {event.total} correct
                  </p>
                </div>
                <div className="text-3xl font-bold font-mono">{event.accuracy.toFixed(1)}%</div>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                  style={{ width: `${event.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EventStats({ eventId, sessions }: { eventId: string; sessions: SessionData[] }) {
  const stats = storage.calculateEventStats(eventId);
  const eventName = getEventName(eventId);

  const eventAttempts = sessions
    .flatMap(s => s.attempts)
    .filter(a => a.eventId === eventId);

  const overallAccuracy = stats.totalAttempts > 0 
    ? (stats.correctAnswers / stats.totalAttempts) * 100 
    : 0;

  // Redemption stats
  const redemptionAttempts = eventAttempts.filter((a) => a.isRedemption);
  const redemptionCorrect = redemptionAttempts.filter((a) => a.correct).length;
  const redemptionAccuracy = redemptionAttempts.length > 0 
    ? (redemptionCorrect / redemptionAttempts.length) * 100 
    : 0;

  // Category stats
  const categoryData = Object.entries(stats.categoryStats).map(([category, catStats]) => ({
    category,
    accuracy: catStats.attempts > 0 ? (catStats.correct / catStats.attempts) * 100 : 0,
    avgTime: catStats.averageTime,
    attempts: catStats.attempts,
    correct: catStats.correct,
  }));

  // Difficulty stats
  const difficultyStats: Record<string, { attempts: number; correct: number; totalTime: number }> = {};
  
  for (const attempt of eventAttempts) {
    if (!difficultyStats[attempt.difficulty]) {
      difficultyStats[attempt.difficulty] = {
        attempts: 0,
        correct: 0,
        totalTime: 0,
      };
    }
    difficultyStats[attempt.difficulty].attempts++;
    if (attempt.correct) {
      difficultyStats[attempt.difficulty].correct++;
    }
    difficultyStats[attempt.difficulty].totalTime += attempt.timeSpent;
  }

  const difficultyData = Object.entries(difficultyStats).map(([difficulty, stats]) => ({
    difficulty,
    accuracy: stats.attempts > 0 ? (stats.correct / stats.attempts) * 100 : 0,
    avgTime: stats.attempts > 0 ? stats.totalTime / stats.attempts : 0,
    attempts: stats.attempts,
  }));

  return (
    <div className="space-y-6">
      {/* Event Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Questions</span>
            </div>
            <div className="text-3xl font-bold font-mono">{stats.totalAttempts}</div>
            <div className="text-xs text-muted-foreground mt-1">{eventName}</div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Accuracy</span>
            </div>
            <div className="text-3xl font-bold font-mono">{overallAccuracy.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{stats.correctAnswers} correct</div>
          </CardContent>
        </Card>

        <Card className="border-chart-3/20 bg-gradient-to-br from-chart-3/5 to-chart-3/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-chart-3" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Avg Time</span>
            </div>
            <div className="text-3xl font-bold font-mono">{stats.averageTime.toFixed(1)}s</div>
            <div className="text-xs text-muted-foreground mt-1">Per question</div>
          </CardContent>
        </Card>

        <Card className="border-chart-4/20 bg-gradient-to-br from-chart-4/5 to-chart-4/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-4/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-chart-4" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">Redemptions</span>
            </div>
            <div className="text-3xl font-bold font-mono">{redemptionAttempts.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{redemptionCorrect} correct</div>
          </CardContent>
        </Card>
      </div>

      {/* Redemption Performance */}
      {redemptionAttempts.length > 0 && (
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle className="text-2xl">Redemption Performance</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Questions retried after initial mistakes</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-accent/10 rounded-xl border border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Redemption Accuracy</div>
                  <div className="text-3xl font-bold font-mono text-accent">{redemptionAccuracy.toFixed(1)}%</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Attempts</div>
                  <div className="text-2xl font-bold font-mono">{redemptionAttempts.length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Performance */}
      {categoryData.length > 0 && (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Category Performance</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Detailed breakdown by topic</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {categoryData.map((cat) => (
              <div key={cat.category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-lg">{cat.category}</h4>
                    <p className="text-sm text-muted-foreground">
                      {cat.correct} / {cat.attempts} correct • {cat.avgTime.toFixed(1)}s avg
                    </p>
                  </div>
                  <div className="text-3xl font-bold font-mono">{cat.accuracy.toFixed(1)}%</div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                    style={{ width: `${cat.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Difficulty Breakdown */}
      {difficultyData.length > 0 && (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-chart-4/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <CardTitle className="text-2xl">Difficulty Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Performance by question difficulty</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {difficultyData.sort((a, b) => {
                const order: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
                return (order[a.difficulty] || 999) - (order[b.difficulty] || 999);
              }).map((diff) => (
                <div key={diff.difficulty} className="p-6 bg-muted/30 rounded-xl border border-border">
                  <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
                    {diff.difficulty}
                  </div>
                  <div className="text-3xl font-bold font-mono mb-2">
                    {diff.accuracy.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {diff.attempts} attempts • {diff.avgTime.toFixed(1)}s avg
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
