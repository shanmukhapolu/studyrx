"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, BarChart3, Trash2, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminGuard } from "@/components/auth/admin-guard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { getEventName, HOSA_EVENTS_DISPLAY_ORDER as HOSA_EVENTS } from "@/lib/events";
import { rtdbGet, rtdbPatch, rtdbPost, rtdbSet } from "@/lib/rtdb";
import { DEFAULT_USER_SETTINGS, type QuestionAttempt, type SessionData, type UserSettings } from "@/lib/storage";
import { formatDuration } from "@/lib/session-analytics";
import { calculateSitewideStats } from "@/lib/sitewide-stats";
import { toast } from "sonner";

type UserRecord = {
  name?: string;
  email?: string;
  role?: "user" | "contributor" | "admin";
  createdAt?: string;
  lastLogin?: string;
  grade?: string;
  referralSource?: string;
  hosaEvents?: string[];
  hosaEventsOther?: string;
  experienceLevel?: string;
  goal?: string;
  charterOrganization?: string;
  questionsPerSession?: string;
  onboardingCompleted?: boolean;
  settings?: UserSettings;
  events?: Record<string, UserEventRecord>;
};

type UserEventRecord = {
  sessions?: Record<string, Partial<SessionData> & { attempts?: string | QuestionAttempt[] }>;
};

type EventRequest = {
  id: string;
  eventName?: string;
  category?: string;
};

type FeedbackSubmission = {
  id: string;
  feedbackType?: string;
  message?: string;
  eventName?: string | null;
  email?: string | null;
  displayName?: string | null;
  testimonialConsent?: boolean;
  submittedBy?: {
    name?: string;
    email?: string;
  };
  createdAt?: string;
};

type SubmittedBy = {
  uid?: string;
  name?: string;
  email?: string;
};

type QuestionSubmission = {
  id: string;
  event?: string;
  tag?: string;
  difficulty?: string;
  question?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  status?: "pending" | "approved" | "rejected";
  adminNotes?: string;
  submittedBy?: SubmittedBy;
  createdAt?: string;
};

type QuestionReport = {
  id: string;
  eventId?: string;
  questionId?: number;
  reason?: string;
  details?: string;
  resolved?: boolean;
  createdAt?: string;
  submittedBy?: SubmittedBy;
};

type UserMessageTarget = {
  uid: string;
  user: UserRecord;
};

function dateLabel(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatStatsDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const days = Math.floor(safeSeconds / 86_400);
  const hours = Math.floor((safeSeconds % 86_400) / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

export default function AdminPage() {
  return (
    <SidebarProvider>
      <AuthGuard>
        <AdminGuard>
          <AppSidebar />
          <SidebarInset>
            <AdminContent />
          </SidebarInset>
        </AdminGuard>
      </AuthGuard>
    </SidebarProvider>
  );
}

function AdminContent() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Record<string, UserRecord>>({});
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [questionSubmissions, setQuestionSubmissions] = useState<QuestionSubmission[]>([]);
  const [questionReports, setQuestionReports] = useState<QuestionReport[]>([]);
  const [feedbackSubmissions, setFeedbackSubmissions] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventFilter, setSelectedEventFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<QuestionSubmission | null>(null);
  const [selectedAnalyticsUser, setSelectedAnalyticsUser] = useState<{ uid: string; user: UserRecord } | null>(null);
  const [selectedMessageUser, setSelectedMessageUser] = useState<UserMessageTarget | null>(null);
  const [adminMessageText, setAdminMessageText] = useState("");
  const [isSendingAdminMessage, setIsSendingAdminMessage] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});

  const loadAll = async () => {
    const [usersData, eventReqData, questionSubData, questionReportsData, feedbackData] = await Promise.all([
      rtdbGet<Record<string, UserRecord>>("users", {}),
      rtdbGet<Record<string, Omit<EventRequest, "id">>>("event_requests", {}),
      rtdbGet<Record<string, Omit<QuestionSubmission, "id">>>("question_submissions", {}),
      rtdbGet<Record<string, Omit<QuestionReport, "id">>>("question_reports", {}),
      rtdbGet<Record<string, Omit<FeedbackSubmission, "id">>>("feedback_submissions", {}),
    ]);

    setUsers(usersData);
    setEventRequests(Object.entries(eventReqData).map(([id, value]) => ({ id, ...value })));
    setQuestionSubmissions(Object.entries(questionSubData).map(([id, value]) => ({ id, ...value })));
    setQuestionReports(Object.entries(questionReportsData).map(([id, value]) => ({ id, ...value })));
    setFeedbackSubmissions(Object.entries(feedbackData).map(([id, value]) => ({ id, ...value })));
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadAll();
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
    const interval = window.setInterval(() => {
      void loadAll();
    }, 12_000);
    return () => window.clearInterval(interval);
  }, []);

  const sortedUsers = useMemo(
    () =>
      Object.entries(users).sort((a, b) => {
        const aTime = new Date(a[1]?.createdAt || "").getTime();
        const bTime = new Date(b[1]?.createdAt || "").getTime();
        return bTime - aTime;
      }),
    [users]
  );

  const filteredSubmissions = useMemo(() => {
    if (selectedEventFilter === "all") return questionSubmissions;
    return questionSubmissions.filter((item) => item.event === selectedEventFilter);
  }, [questionSubmissions, selectedEventFilter]);

  const eventRequestCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    eventRequests.forEach((request) => {
      const key = request.eventName || "Unknown event";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([eventName, count]) => ({ eventName, count }))
      .sort((a, b) => b.count - a.count || a.eventName.localeCompare(b.eventName));
  }, [eventRequests]);

  const sitewideStats = useMemo(() => calculateSitewideStats(users), [users]);
  const contentEventRows = useMemo(() => {
    const knownEventNames = HOSA_EVENTS.map((event) => event.name);
    const knownSet = new Set(knownEventNames);
    const extraEventNames = Object.keys(sitewideStats.contentAnalytics.perEventStats)
      .filter((eventName) => !knownSet.has(eventName))
      .sort((a, b) => a.localeCompare(b));

    return [...knownEventNames, ...extraEventNames].map((eventName) => ({
      eventName,
      stats: sitewideStats.contentAnalytics.perEventStats[eventName],
    }));
  }, [sitewideStats.contentAnalytics.perEventStats]);

  useEffect(() => {
    if (loading) return;
    void rtdbSet("admin_stats/sitewide", sitewideStats).catch(() => {
      // Silent failure: stats UI still renders from live calculations.
    });
  }, [loading, sitewideStats]);

  const updateRole = async (uid: string, nextRole: "user" | "contributor" | "admin") => {
    if (currentUser?.uid === uid) {
      toast.error("You can't change your own role.");
      return;
    }
    try {
      await rtdbPatch(`users/${uid}`, { role: nextRole });
      await loadAll();
      toast.success(`Updated role to ${nextRole}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role.");
    }
  };

  const updateUserName = async (uid: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty.");
      return;
    }

    try {
      await rtdbPatch(`users/${uid}`, { name: trimmed });
      setUsers((prev) => ({ ...prev, [uid]: { ...prev[uid], name: trimmed } }));
      toast.success("Updated user name.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update name.");
    }
  };

  const setSubmissionStatus = async (submission: QuestionSubmission, status: "approved" | "rejected") => {
    try {
      await rtdbPatch(`question_submissions/${submission.id}`, {
        status,
        adminNotes,
        reviewedAt: new Date().toISOString(),
      });
      if (submission.submittedBy?.uid) {
        await rtdbPatch(`users/${submission.submittedBy.uid}/question_submissions/${submission.id}`, {
          status,
          adminNotes,
          reviewedAt: new Date().toISOString(),
        });
      }

      if (submission.submittedBy?.uid) {
        await rtdbPost(`users/${submission.submittedBy.uid}/notifications`, {
          type: "question_submission_update",
          status,
          message: status === "approved" ? "Your submitted question was approved." : "Your submitted question was rejected. You can update and resubmit it.",
          submissionId: submission.id,
          createdAt: new Date().toISOString(),
        });
      }

      await loadAll();
      setSelectedSubmission((current) => (current ? { ...current, status, adminNotes } : current));
      toast.success(`Marked submission as ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update submission.");
    }
  };

  const deleteNode = async (path: string) => {
    try {
      await rtdbSet(path, null);
      await loadAll();
      toast.success("Deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const toggleReportResolved = async (report: QuestionReport) => {
    try {
      await rtdbPatch(`question_reports/${report.id}`, { resolved: !report.resolved });
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update report.");
    }
  };

  const sendAdminMessage = async () => {
    if (!selectedMessageUser?.uid) return;
    const trimmedMessage = adminMessageText.trim();
    if (!trimmedMessage) {
      toast.error("Message cannot be empty.");
      return;
    }

    try {
      setIsSendingAdminMessage(true);
      await rtdbPost(`users/${selectedMessageUser.uid}/notifications`, {
        type: "admin_message",
        message: trimmedMessage,
        status: "info",
        createdAt: new Date().toISOString(),
      });
      toast.success("Admin message queued for next login.");
      setSelectedMessageUser(null);
      setAdminMessageText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send admin message.");
    } finally {
      setIsSendingAdminMessage(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading admin data...</p>
      ) : (
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="stats">Sitewide Stats</TabsTrigger>
            <TabsTrigger value="events">Event Requests</TabsTrigger>
            <TabsTrigger value="submissions">Question Submissions</TabsTrigger>
            <TabsTrigger value="reports">Question Reports</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-3">
            {sortedUsers.length === 0 && <p className="text-sm text-muted-foreground">No users found. Check DB rules/role permissions for admin reads.</p>}
            {sortedUsers.map(([uid, user]) => (
              <Card key={uid}>
                <CardContent className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{user.name || "Unnamed User"} · {user.role || "user"}</p>
                    <p className="truncate text-muted-foreground">{user.email || uid}</p>
                    <p className="text-xs text-muted-foreground">Created: {dateLabel(user.createdAt)} · Last login: {dateLabel(user.lastLogin)}</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>
                        Onboarding:{" "}
                        <span className={user.onboardingCompleted ? "text-green-600" : "text-amber-600"}>
                          {user.onboardingCompleted ? "Completed" : "Incomplete"}
                        </span>
                      </p>
                      {user.onboardingCompleted && (
                        <details className="group mt-2 rounded-md border bg-muted/30 px-3 py-2">
                          <summary className="cursor-pointer select-none text-xs font-medium text-foreground">
                            View onboarding responses
                          </summary>
                          <div className="mt-2 space-y-1">
                            <p>Grade: {user.grade || "—"}</p>
                            <p>Referral Source: {user.referralSource || "—"}</p>
                            <p>HOSA Events: {(user.hosaEvents && user.hosaEvents.length > 0) ? user.hosaEvents.join(", ") : "—"}</p>
                            {user.hosaEvents?.includes("Other") && (
                              <p>Other Event: {user.hosaEventsOther || "—"}</p>
                            )}
                            <p>Experience Level: {user.experienceLevel || "—"}</p>
                            <p>Goal: {user.goal || "—"}</p>
                            <p>Charter Organization: {user.charterOrganization || "—"}</p>
                          </div>
                        </details>
                      )}
                    </div>
                    <div className="mt-3 flex max-w-md gap-2">
                      <Input
                        value={draftNames[uid] ?? user.name ?? ""}
                        onChange={(event) => setDraftNames((prev) => ({ ...prev, [uid]: event.target.value }))}
                        placeholder="Update user name"
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateUserName(uid, draftNames[uid] ?? user.name ?? "")}
                      >
                        Save Name
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedAnalyticsUser({ uid, user })}>
                      <BarChart3 className="mr-1 h-4 w-4" />
                      Analytics
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMessageUser({ uid, user });
                        setAdminMessageText("");
                      }}
                    >
                      Message
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void updateRole(uid, "user")} disabled={currentUser?.uid === uid || (user.role || "user") === "user"}>
                      Make User
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void updateRole(uid, "contributor")} disabled={currentUser?.uid === uid || user.role === "contributor"}>
                      Make Contributor
                    </Button>
                    <Button size="sm" onClick={() => void updateRole(uid, "admin")} disabled={currentUser?.uid === uid || user.role === "admin"}>
                      Make Admin
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void deleteNode(`users/${uid}`)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="stats" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Adoption</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                <p>Total users: <strong>{sitewideStats.adoption.totalUsers}</strong></p>
                <p>New users (last 7 days): <strong>{sitewideStats.adoption.newUsersLast7Days}</strong></p>
                <p>Active users (last 7 days, at least 1 session): <strong>{sitewideStats.adoption.activeUsersLast7Days}</strong></p>
                <p>Users with login in last 7 days: <strong>{sitewideStats.adoption.loginUsersLast7Days}</strong></p>
                <p>Growth rate (week over week): <strong>{sitewideStats.adoption.growthRateWeekOverWeek}%</strong></p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                <p>Total sessions completed: <strong>{sitewideStats.engagement.totalSessionsCompleted}</strong></p>
                <p>Avg sessions per user: <strong>{sitewideStats.engagement.avgSessionsPerUser}</strong></p>
                <p>Avg questions per session: <strong>{sitewideStats.engagement.avgQuestionsPerSession}</strong></p>
                <p>Avg time per session: <strong>{formatStatsDuration(sitewideStats.engagement.avgTimePerSessionSeconds)}</strong></p>
                <p>Total time spent practicing: <strong>{formatStatsDuration(sitewideStats.engagement.totalThinkTimeSeconds)}</strong></p>
                <p>Total time spent reviewing explanations: <strong>{formatStatsDuration(sitewideStats.engagement.totalExplanationTimeSeconds)}</strong></p>
                <p>% users who return after first session: <strong>{sitewideStats.engagement.retentionAfterFirstSessionPct}%</strong></p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Effectiveness</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                <p>Overall average accuracy: <strong>{sitewideStats.learningEffectiveness.overallAverageAccuracyPct}%</strong></p>
                <p>Redemption round avg accuracy: <strong>{sitewideStats.learningEffectiveness.redemptionRoundAvgAccuracyPct}%</strong></p>
                <p>Avg improvement (last - first in same event): <strong>{sitewideStats.learningEffectiveness.avgImprovementFirstToLastSameEventPct}%</strong></p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>Most used event: <strong>{sitewideStats.contentAnalytics.mostUsedEvent}</strong></p>
                <p>Least used event: <strong>{sitewideStats.contentAnalytics.leastUsedEvent}</strong></p>
                <p>Total questions attempted: <strong>{sitewideStats.contentAnalytics.totalQuestionsAttempted}</strong></p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                        <th>Event</th>
                        <th>Accuracy</th>
                        <th>Questions attempted</th>
                        <th># Users</th>
                        <th>Time spent practicing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentEventRows.map(({ eventName, stats }) => (
                        <tr key={eventName} className="border-t align-top [&>td]:px-3 [&>td]:py-2">
                          <td className="font-medium">{eventName}</td>
                          <td>{stats ? `${stats.accuracyPct}%` : "—"}</td>
                          <td>{stats ? stats.questionsAttempted : "—"}</td>
                          <td>{stats ? stats.usersCount : "—"}</td>
                          <td>{stats ? formatStatsDuration(stats.practiceTimeSeconds) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {contentEventRows.length === 0 && (
                    <p className="p-3 text-muted-foreground">No event session data yet.</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 font-medium">Average accuracy per event</p>
                  <div className="grid gap-1 md:grid-cols-2">
                    {Object.entries(sitewideStats.contentAnalytics.averageAccuracyPerEvent).map(([eventName, accuracy]) => (
                      <p key={eventName}>{eventName}: <strong>{accuracy}%</strong></p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                <p>Avg days between sessions per user: <strong>{sitewideStats.retention.avgDaysBetweenSessionsPerUser}</strong></p>
                <p>% users with ≥2 sessions: <strong>{sitewideStats.retention.usersWithAtLeast2SessionsPct}%</strong></p>
                <p>% users with ≥5 sessions: <strong>{sitewideStats.retention.usersWithAtLeast5SessionsPct}%</strong></p>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">Last refreshed: {dateLabel(sitewideStats.generatedAt)}</p>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {eventRequestCounts.map((item) => (
                <Card key={item.eventName}>
                  <CardContent className="flex items-center justify-between p-2.5 text-xs">
                    <div>
                      <p className="font-medium leading-tight">{item.eventName || "Unnamed event"}</p>
                      <p className="text-[11px] text-muted-foreground">Requests</p>
                    </div>
                    <span className="text-base font-semibold text-primary">{item.count}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Filter by Event</label>
              <select
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={selectedEventFilter}
                onChange={(event) => setSelectedEventFilter(event.target.value)}
              >
                <option value="all">All events</option>
                {HOSA_EVENTS.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredSubmissions.map((item) => (
                <button
                  key={item.id}
                  className={`rounded-lg border p-3 text-left transition hover:border-primary ${item.status === "approved" ? "bg-green-50/60" : item.status === "rejected" ? "bg-red-50/60" : "bg-card"}`}
                  onClick={() => {
                    setSelectedSubmission(item);
                    setAdminNotes(item.adminNotes || "");
                  }}
                >
                  <p className="text-sm font-semibold">{item.event || "Unknown event"}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.tag || "No topic"}</p>
                  <p className="text-xs capitalize text-muted-foreground">{item.status || "pending"}</p>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <div className="space-y-2">
              {questionReports.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {getEventName(item.eventId || "—")} · Q{String(item.questionId || "—")} · {item.reason || "Unknown reason"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{item.details || "No details"}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.submittedBy?.name || item.submittedBy?.email || "Unknown user"} · {dateLabel(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => void toggleReportResolved(item)} className={item.resolved ? "text-green-600" : ""}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void deleteNode(`question_reports/${item.id}`)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            <div className="space-y-2">
              {feedbackSubmissions.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{item.feedbackType || "Feedback"} {item.eventName ? `· ${item.eventName}` : ""}</p>
                        <p>{item.message || "No message"}</p>
                        {item.feedbackType === "Testimonial" && (
                          <p className="text-muted-foreground">
                            Name: {item.displayName || "Anonymous"} · Consent: {item.testimonialConsent ? "Granted" : "Not granted"}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          {item.submittedBy?.name || "Unknown user"} · {item.email || item.submittedBy?.email || "No email"} · {dateLabel(item.createdAt)}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => void deleteNode(`feedback_submissions/${item.id}`)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{selectedSubmission.event || "Question submission"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Topic: {selectedSubmission.tag || "—"} · Difficulty: {selectedSubmission.difficulty || "—"}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedSubmission(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>Submitted by:</strong> {selectedSubmission.submittedBy?.name || "Unknown"} ({selectedSubmission.submittedBy?.email || "—"})</p>
              <p><strong>Submitted at:</strong> {dateLabel(selectedSubmission.createdAt)}</p>
              <p><strong>Question:</strong> {selectedSubmission.question || "—"}</p>
              <p><strong>Options:</strong> {(selectedSubmission.options || []).join(" | ") || "—"}</p>
              <p><strong>Correct answer:</strong> {selectedSubmission.correctAnswer || "—"}</p>
              <p><strong>Explanation:</strong> {selectedSubmission.explanation || "—"}</p>
              <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify({
                  question: selectedSubmission.question,
                  options: selectedSubmission.options,
                  correctAnswer: selectedSubmission.correctAnswer,
                  category: selectedSubmission.event,
                  difficulty: selectedSubmission.difficulty,
                  explanation: selectedSubmission.explanation,
                  tag: selectedSubmission.tag,
                }, null, 2)}
              </pre>
              <Input value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} placeholder="Admin notes" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void setSubmissionStatus(selectedSubmission, "approved")}>Approve</Button>
                <Button variant="outline" onClick={() => void setSubmissionStatus(selectedSubmission, "rejected")}>Reject</Button>
                <Button
                  variant="ghost"
                  disabled={selectedSubmission.status !== "approved" && selectedSubmission.status !== "rejected"}
                  onClick={async () => {
                    await deleteNode(`question_submissions/${selectedSubmission.id}`);
                    setSelectedSubmission(null);
                  }}
                >
                  Delete
                </Button>
                {selectedSubmission.status !== "approved" && selectedSubmission.status !== "rejected" && (
                  <p className="w-full text-xs text-muted-foreground">
                    Approve or reject this submission before deleting it.
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(JSON.stringify({
                      question: selectedSubmission.question,
                      options: selectedSubmission.options,
                      correctAnswer: selectedSubmission.correctAnswer,
                      category: selectedSubmission.event,
                      difficulty: selectedSubmission.difficulty,
                      explanation: selectedSubmission.explanation,
                      tag: selectedSubmission.tag,
                    }, null, 2));
                    toast.success("JSON copied.");
                  }}
                >
                  Copy JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedAnalyticsUser && (
        <UserAnalyticsModal
          uid={selectedAnalyticsUser.uid}
          user={selectedAnalyticsUser.user}
          onClose={() => setSelectedAnalyticsUser(null)}
        />
      )}

      {selectedMessageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Message User</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedMessageUser.user.name || "Unnamed User"} · {selectedMessageUser.user.email || selectedMessageUser.uid}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedMessageUser(null);
                  setAdminMessageText("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Type the message shown to this user on next login..."
                value={adminMessageText}
                onChange={(event) => setAdminMessageText(event.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMessageUser(null);
                    setAdminMessageText("");
                  }}
                >
                  Cancel
                </Button>
                <Button disabled={isSendingAdminMessage} onClick={() => void sendAdminMessage()}>
                  {isSendingAdminMessage ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function UserAnalyticsModal({ uid, user, onClose }: { uid: string; user: UserRecord; onClose: () => void }) {
  const sessions = useMemo(() => normalizeUserSessions(user), [user]);
  const settings = user.settings ?? DEFAULT_USER_SETTINGS;
  const attempts = sessions.flatMap((session) => session.attempts);
  const primaryAttempts = attempts.filter((attempt) => !attempt.isRedemption);
  const redemptionAttempts = attempts.filter((attempt) => attempt.isRedemption);
  const correctPrimary = primaryAttempts.filter((attempt) => attempt.isCorrect).length;
  const totalThink = primaryAttempts.reduce((sum, attempt) => sum + attempt.thinkTime, 0);
  const totalExplanation = primaryAttempts.reduce((sum, attempt) => sum + attempt.explanationTime, 0);
  const totalQuestions = primaryAttempts.length;
  const avgThink = totalQuestions ? totalThink / totalQuestions : 0;
  const avgExplanation = totalQuestions ? totalExplanation / totalQuestions : 0;
  const redemptionCorrect = redemptionAttempts.filter((attempt) => attempt.isCorrect).length;

  const eventStats = useMemo(() => {
    const perEvent: Record<string, { attempts: number; correct: number; thinkTime: number }> = {};
    primaryAttempts.forEach((attempt) => {
      const eventId = attempt.eventId || "unknown";
      if (!perEvent[eventId]) {
        perEvent[eventId] = { attempts: 0, correct: 0, thinkTime: 0 };
      }
      perEvent[eventId].attempts += 1;
      perEvent[eventId].thinkTime += attempt.thinkTime;
      if (attempt.isCorrect) perEvent[eventId].correct += 1;
    });
    return Object.entries(perEvent)
      .map(([eventId, stats]) => ({
        eventId,
        attempts: stats.attempts,
        accuracy: stats.attempts ? (stats.correct / stats.attempts) * 100 : 0,
        avgThink: stats.attempts ? stats.thinkTime / stats.attempts : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [primaryAttempts]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4">
      <Card className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between border-b">
          <div>
            <CardTitle>{user.name || "Unnamed User"} · Analytics</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email || uid}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close analytics">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-auto p-4">
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No analytics data yet for this user.</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricItem label="Sessions Completed" value={`${sessions.length}`} />
                <MetricItem label="Questions Answered" value={`${totalQuestions}`} />
                <MetricItem label="Accuracy" value={`${(totalQuestions ? (correctPrimary / totalQuestions) * 100 : 0).toFixed(1)}%`} />
                <MetricItem label="Total Practice Time" value={formatDuration(totalThink + totalExplanation)} />
                <MetricItem label="Avg Think Time" value={`${avgThink.toFixed(1)}s`} />
                {settings.showExplanationTime && <MetricItem label="Avg Explanation Time" value={`${avgExplanation.toFixed(1)}s`} />}
                <MetricItem label="Redemption Attempts" value={`${redemptionAttempts.length}`} />
                <MetricItem
                  label="Redemption Accuracy"
                  value={`${(redemptionAttempts.length ? (redemptionCorrect / redemptionAttempts.length) * 100 : 0).toFixed(1)}%`}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Event Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {eventStats.map((event) => (
                    <div key={event.eventId} className="flex items-center justify-between rounded-md border p-2">
                      <span className="font-medium">{getEventName(event.eventId)}</span>
                      <span className="text-muted-foreground">
                        {event.attempts} Q • {event.accuracy.toFixed(1)}% • {event.avgThink.toFixed(1)}s avg think
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {sessions
                    .slice()
                    .sort((a, b) => new Date(b.startTimestamp).getTime() - new Date(a.startTimestamp).getTime())
                    .slice(0, 8)
                    .map((session) => (
                      <div key={session.sessionId} className="rounded-md border p-2">
                        <p className="font-medium">{getEventName(session.event)} · {new Date(session.startTimestamp).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.totalQuestions} Q • {session.accuracy.toFixed(1)}% • {formatDuration(session.totalThinkTime + session.totalExplanationTime)}
                        </p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function normalizeUserSessions(user: UserRecord): SessionData[] {
  const events = user.events ?? {};
  return Object.entries(events).flatMap(([eventId, event]) => {
    const sessions = event.sessions ?? {};
    return Object.values(sessions).map((session) => {
      const rawAttempts = session.attempts;
      let attempts: QuestionAttempt[] = [];
      if (typeof rawAttempts === "string") {
        try {
          const parsed = JSON.parse(rawAttempts);
          if (Array.isArray(parsed)) attempts = parsed as QuestionAttempt[];
        } catch {
          attempts = [];
        }
      } else if (Array.isArray(rawAttempts)) {
        attempts = rawAttempts;
      }

      const totalQuestions = session.totalQuestions ?? attempts.length;
      const correctCount = session.correctCount ?? attempts.filter((attempt) => attempt.isCorrect).length;
      const totalThinkTime = session.totalThinkTime ?? attempts.reduce((sum, attempt) => sum + (attempt.thinkTime || 0), 0);
      const totalExplanationTime = session.totalExplanationTime ?? attempts.reduce((sum, attempt) => sum + (attempt.explanationTime || 0), 0);

      return {
        sessionId: session.sessionId ?? `${eventId}-${Math.random().toString(36).slice(2, 8)}`,
        sessionType: session.sessionType ?? "practice",
        event: session.event ?? eventId,
        startTimestamp: session.startTimestamp ?? session.startTime ?? new Date().toISOString(),
        endTimestamp: session.endTimestamp ?? session.endTime,
        totalThinkTime,
        totalExplanationTime,
        totalQuestions,
        correctCount,
        accuracy: session.accuracy ?? (totalQuestions ? (correctCount / totalQuestions) * 100 : 0),
        attempts,
      };
    });
  });
}
