"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { storage } from "@/lib/storage";
import { HOSA_EVENTS_DISPLAY_ORDER as HOSA_EVENTS } from "@/lib/events";
import { BookOpen, Play, TrendingUp } from "lucide-react";
import { rtdbGet, rtdbPost, rtdbSet } from "@/lib/rtdb";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { EVENT_CATEGORY_OPTIONS } from "@/lib/event-request-options";

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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    category: "Health Science",
    eventName: EVENT_CATEGORY_OPTIONS["Health Science"][0],
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const { user, profile } = useAuth();

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
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">HOSA Competitive Events</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Choose an event to start practicing
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowRequestModal(true)}>Request New Event</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="mb-8 rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">Practice Tips</p>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            {[
              { n: "1", title: "Start with Basics", desc: "Begin with Medical Terminology to build a strong foundation" },
              { n: "2", title: "Practice Regularly", desc: "Consistent daily practice yields the best results" },
              { n: "3", title: "Track Progress", desc: "Use analytics to identify areas needing improvement" },
            ].map((tip) => (
              <div key={tip.n} className="flex items-start gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {tip.n}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{tip.title}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {HOSA_EVENTS.map((event) => {
            const stats = eventStats[event.id];
            const Icon = event.icon;
            const isPublished = event.published;
            
            return (
              <Card
                key={event.id}
                className={`rounded-xl border bg-card transition-all duration-200 ${
                  isPublished
                    ? "border-border hover:border-primary/40"
                    : "opacity-55 grayscale"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="mb-3 flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPublished ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`h-5 w-5 ${isPublished ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    {stats && isPublished && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                        <div className="text-base font-bold tabular-nums text-primary">
                          {stats.accuracy.toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-base font-semibold">{event.name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2.5">
                    {stats && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>{stats.attempted} questions practiced</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {isPublished ? (
                        <>
                          <Button asChild size="sm" className="flex-1">
                            <Link href={`/practice/${event.id}`}>
                              <Play className="mr-1.5 h-3.5 w-3.5" />
                              Practice
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="flex-1">
                            <Link href={`/resources/${event.id}`}>
                              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                              Resources
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button disabled variant="secondary" size="sm" className="flex-1 cursor-not-allowed">
                            Coming Soon
                          </Button>
                          <Button disabled variant="outline" size="sm" className="flex-1 cursor-not-allowed">
                            Coming Soon
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Request New Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                value={requestForm.category}
                onChange={(event) =>
                  setRequestForm({
                    category: event.target.value,
                    eventName: EVENT_CATEGORY_OPTIONS[event.target.value][0],
                  })
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option>Health Science</option>
                <option>Health Professions</option>
                <option>ATC</option>
                <option>Emergency Preparedness</option>
                <option>Teamwork</option>
                <option>Recognition</option>
              </select>
              <select
                value={requestForm.eventName}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, eventName: event.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {EVENT_CATEGORY_OPTIONS[requestForm.category].map((eventOption) => (
                  <option key={eventOption} value={eventOption}>{eventOption}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
                <Button
                  disabled={isSubmittingRequest || !requestForm.eventName}
                  onClick={async () => {
                    try {
                      setIsSubmittingRequest(true);
                      if (!user?.uid) throw new Error("Please sign in to request events.");
                      const requestKey = requestForm.eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                      const existing = await rtdbGet<boolean | null>(`users/${user.uid}/event_requests/${requestKey}`, null);
                      if (existing) {
                        toast.error("You already requested this event.");
                        return;
                      }
                      await rtdbPost("event_requests", {
                        ...requestForm,
                        requestKey,
                        submittedBy: {
                          uid: user.uid,
                          name: [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || user.displayName || "",
                          email: user.email || "",
                        },
                        createdAt: new Date().toISOString(),
                      });
                      await rtdbSet(`users/${user.uid}/event_requests/${requestKey}`, true);
                      toast.success("Event request submitted.");
                      setShowRequestModal(false);
                      setRequestForm({ category: "Health Science", eventName: EVENT_CATEGORY_OPTIONS["Health Science"][0] });
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to submit request.");
                    } finally {
                      setIsSubmittingRequest(false);
                    }
                  }}
                >
                  {isSubmittingRequest ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
