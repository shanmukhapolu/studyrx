"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SessionTimeline } from "@/components/session-timeline";
import { storage, type SessionData } from "@/lib/storage";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const formatDuration = (seconds: number) => {
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

export default function SessionDetailPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SessionDetailContent />
      </SidebarInset>
    </SidebarProvider>
  );
}

function SessionDetailContent() {
  const params = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    const sessions = storage.getAllSessions();
    const match = sessions.find((s) => s.sessionId === params.sessionId) || null;
    setSession(match);
  }, [params.sessionId]);

  const analytics = useMemo(() => {
    if (!session) return null;

    const attempts = session.attempts;
    const totalQuestions = attempts.length;
    const totalThinkTime = attempts.reduce((sum, a) => sum + a.thinkTime, 0);
    const totalExplanationTime = attempts.reduce((sum, a) => sum + a.explanationTime, 0);
    const accuracy = totalQuestions > 0 ? (attempts.filter((a) => a.isCorrect).length / totalQuestions) * 100 : 0;
    const avgThinkTime = totalQuestions > 0 ? totalThinkTime / totalQuestions : 0;
    const avgExplanationTime = totalQuestions > 0 ? totalExplanationTime / totalQuestions : 0;

    let longestCorrectStreak = 0;
    let longestIncorrectStreak = 0;
    let currentCorrect = 0;
    let currentIncorrect = 0;

    attempts.forEach((attempt) => {
      if (attempt.isCorrect) {
        currentCorrect += 1;
        currentIncorrect = 0;
        longestCorrectStreak = Math.max(longestCorrectStreak, currentCorrect);
      } else {
        currentIncorrect += 1;
        currentCorrect = 0;
        longestIncorrectStreak = Math.max(longestIncorrectStreak, currentIncorrect);
      }
    });

    const topicStats: Record<string, { attempts: number; correct: number }> = {};
    attempts.forEach((attempt) => {
      if (!topicStats[attempt.category]) {
        topicStats[attempt.category] = { attempts: 0, correct: 0 };
      }
      topicStats[attempt.category].attempts += 1;
      if (attempt.isCorrect) {
        topicStats[attempt.category].correct += 1;
      }
    });

    const eligibleTopics = Object.entries(topicStats)
      .filter(([, stats]) => stats.attempts >= 5)
      .map(([category, stats]) => ({
        category,
        accuracy: stats.correct / stats.attempts,
        attempts: stats.attempts,
      }));

    const hardestTopic = eligibleTopics.length
      ? eligibleTopics.reduce(
          (min, topic) => (topic.accuracy < min.accuracy ? topic : min),
          eligibleTopics[0]
        )
      : undefined;
    const easiestTopic = eligibleTopics.length
      ? eligibleTopics.reduce(
          (max, topic) => (topic.accuracy > max.accuracy ? topic : max),
          eligibleTopics[0]
        )
      : undefined;

    const difficultyStats: Record<
      string,
      { attempts: number; totalThinkTime: number; totalExplanationTime: number }
    > = {};
    attempts.forEach((attempt) => {
      if (!difficultyStats[attempt.difficulty]) {
        difficultyStats[attempt.difficulty] = {
          attempts: 0,
          totalThinkTime: 0,
          totalExplanationTime: 0,
        };
      }
      difficultyStats[attempt.difficulty].attempts += 1;
      difficultyStats[attempt.difficulty].totalThinkTime += attempt.thinkTime;
      difficultyStats[attempt.difficulty].totalExplanationTime += attempt.explanationTime;
    });

    const difficultyData = Object.entries(difficultyStats).map(([difficulty, stats]) => ({
      difficulty,
      avgThinkTime: stats.attempts > 0 ? stats.totalThinkTime / stats.attempts : 0,
      avgExplanationTime: stats.attempts > 0 ? stats.totalExplanationTime / stats.attempts : 0,
      attempts: stats.attempts,
    }));

    return {
      totalQuestions,
      totalThinkTime,
      totalExplanationTime,
      accuracy,
      avgThinkTime,
      avgExplanationTime,
      longestCorrectStreak,
      longestIncorrectStreak,
      hardestTopic,
      easiestTopic,
      difficultyData,
    };
  }, [session]);

  if (!session || !analytics) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We couldn't locate that session. Try selecting one from the session logs.
            </p>
            <Button asChild>
              <Link href="/sessions">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Session Logs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Session Details</h1>
            <p className="text-muted-foreground mt-1 font-light">
              {session.eventName} • {new Date(session.startTimestamp).toLocaleString()}
            </p>
          </div>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/sessions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Logs
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8 max-w-6xl">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <div className="text-3xl font-bold font-mono mt-2">{analytics.accuracy.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">{analytics.totalQuestions} questions</div>
            </CardContent>
          </Card>
          <Card className="border-chart-3/20 bg-gradient-to-br from-chart-3/5 to-chart-3/10">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Total Think Time</div>
              <div className="text-3xl font-bold font-mono mt-2">
                {formatDuration(analytics.totalThinkTime)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Avg {analytics.avgThinkTime.toFixed(1)}s per question
              </div>
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Total Explanation Time</div>
              <div className="text-3xl font-bold font-mono mt-2">
                {formatDuration(analytics.totalExplanationTime)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Avg {analytics.avgExplanationTime.toFixed(1)}s per question
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Question Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionTimeline attempts={session.attempts} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="text-sm text-muted-foreground">Longest Correct Streak</div>
                <div className="text-2xl font-bold font-mono mt-1">{analytics.longestCorrectStreak}</div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="text-sm text-muted-foreground">Longest Incorrect Streak</div>
                <div className="text-2xl font-bold font-mono mt-1">{analytics.longestIncorrectStreak}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="text-sm text-muted-foreground">Hardest Topic</div>
                <div className="text-lg font-semibold mt-1">
                  {analytics.hardestTopic ? analytics.hardestTopic.category : "Not enough data"}
                </div>
                {analytics.hardestTopic && (
                  <div className="text-xs text-muted-foreground">
                    {(analytics.hardestTopic.accuracy * 100).toFixed(1)}% accuracy over {analytics.hardestTopic.attempts} attempts
                  </div>
                )}
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="text-sm text-muted-foreground">Easiest Topic</div>
                <div className="text-lg font-semibold mt-1">
                  {analytics.easiestTopic ? analytics.easiestTopic.category : "Not enough data"}
                </div>
                {analytics.easiestTopic && (
                  <div className="text-xs text-muted-foreground">
                    {(analytics.easiestTopic.accuracy * 100).toFixed(1)}% accuracy over {analytics.easiestTopic.attempts} attempts
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-3">
                Avg Think/Explanation Time by Difficulty
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {analytics.difficultyData
                  .sort((a, b) => {
                    const order: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
                    return (order[a.difficulty] || 999) - (order[b.difficulty] || 999);
                  })
                  .map((diff) => (
                    <div key={diff.difficulty} className="p-4 rounded-xl border border-border bg-muted/30">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                        {diff.difficulty}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">Avg Think</div>
                      <div className="text-xl font-bold font-mono">{diff.avgThinkTime.toFixed(1)}s</div>
                      <div className="mt-2 text-sm text-muted-foreground">Avg Explanation</div>
                      <div className="text-xl font-bold font-mono">
                        {diff.avgExplanationTime.toFixed(1)}s
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">{diff.attempts} attempts</div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
