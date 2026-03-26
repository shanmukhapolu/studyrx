"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminGuard } from "@/components/auth/admin-guard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { HOSA_EVENTS } from "@/lib/events";
import { rtdbGet, rtdbPatch, rtdbPost, rtdbSet } from "@/lib/rtdb";
import { toast } from "sonner";

type UserRecord = {
  name?: string;
  email?: string;
  role?: "user" | "admin";
  createdAt?: string;
  lastLogin?: string;
};

type EventRequest = {
  id: string;
  eventName?: string;
  category?: string;
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
};

function dateLabel(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
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
  const [users, setUsers] = useState<Record<string, UserRecord>>({});
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [questionSubmissions, setQuestionSubmissions] = useState<QuestionSubmission[]>([]);
  const [questionReports, setQuestionReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventFilter, setSelectedEventFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<QuestionSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const loadAll = async () => {
    const [usersData, eventReqData, questionSubData, questionReportsData] = await Promise.all([
      rtdbGet<Record<string, UserRecord>>("users", {}),
      rtdbGet<Record<string, Omit<EventRequest, "id">>>("event_requests", {}),
      rtdbGet<Record<string, Omit<QuestionSubmission, "id">>>("question_submissions", {}),
      rtdbGet<Record<string, Omit<QuestionReport, "id">>>("question_reports", {}),
    ]);

    setUsers(usersData);
    setEventRequests(Object.entries(eventReqData).map(([id, value]) => ({ id, ...value })));
    setQuestionSubmissions(Object.entries(questionSubData).map(([id, value]) => ({ id, ...value })));
    setQuestionReports(Object.entries(questionReportsData).map(([id, value]) => ({ id, ...value })));
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

  const updateRole = async (uid: string, currentRole?: string) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      await rtdbPatch(`users/${uid}`, { role: nextRole });
      await loadAll();
      toast.success(`Updated role to ${nextRole}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role.");
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

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading admin data...</p>
      ) : (
        <Tabs defaultValue="users">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="events">Event Requests</TabsTrigger>
            <TabsTrigger value="submissions">Question Submissions</TabsTrigger>
            <TabsTrigger value="reports">Question Reports</TabsTrigger>
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
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void updateRole(uid, user.role)}>Toggle Role</Button>
                    <Button size="sm" variant="outline" onClick={() => void deleteNode(`users/${uid}`)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <div className="space-y-2">
              {eventRequests.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium">{item.eventName || "Unnamed event"}</p>
                      <p className="text-xs text-muted-foreground">{item.category || "—"}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => void deleteNode(`event_requests/${item.id}`)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                      <p className="font-medium">Q{String(item.questionId || "—")} · {item.reason || "Unknown reason"}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.details || "No details"}</p>
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
                  onClick={async () => {
                    await deleteNode(`question_submissions/${selectedSubmission.id}`);
                    if (selectedSubmission.submittedBy?.uid) {
                      await deleteNode(`users/${selectedSubmission.submittedBy.uid}/question_submissions/${selectedSubmission.id}`);
                    }
                    setSelectedSubmission(null);
                  }}
                >
                  Delete
                </Button>
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
    </div>
  );
}
