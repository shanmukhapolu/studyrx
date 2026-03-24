"use client";

import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminGuard } from "@/components/auth/admin-guard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { rtdbGet, rtdbPatch, rtdbSet } from "@/lib/rtdb";

type UserRecord = {
  name?: string;
  email?: string;
  role?: "user" | "admin";
  createdAt?: string;
  lastLogin?: string;
};

type AdminItem = {
  id: string;
  status?: string;
  adminNotes?: string;
  [key: string]: unknown;
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
  const [eventRequests, setEventRequests] = useState<AdminItem[]>([]);
  const [questionSubmissions, setQuestionSubmissions] = useState<AdminItem[]>([]);
  const [questionReports, setQuestionReports] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersData, eventReqData, questionSubData, questionReportsData] = await Promise.all([
          rtdbGet<Record<string, UserRecord>>("users", {}),
          rtdbGet<Record<string, Omit<AdminItem, "id">>>("event_requests", {}),
          rtdbGet<Record<string, Omit<AdminItem, "id">>>("question_submissions", {}),
          rtdbGet<Record<string, Omit<AdminItem, "id">>>("question_reports", {}),
        ]);
        setUsers(usersData);
        setEventRequests(Object.entries(eventReqData).map(([id, value]) => ({ id, ...value })));
        setQuestionSubmissions(Object.entries(questionSubData).map(([id, value]) => ({ id, ...value })));
        setQuestionReports(Object.entries(questionReportsData).map(([id, value]) => ({ id, ...value })));
      } finally {
        setLoading(false);
      }
    };
    void load();
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

  const updateRole = async (uid: string, currentRole?: string) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      await rtdbPatch(`users/${uid}`, { role: nextRole });
      setUsers((prev) => ({ ...prev, [uid]: { ...prev[uid], role: nextRole } }));
      toast.success(`Updated role to ${nextRole}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role.");
    }
  };

  const deleteUser = async (uid: string) => {
    try {
      await rtdbSet(`users/${uid}`, null);
      setUsers((prev) => {
        const copy = { ...prev };
        delete copy[uid];
        return copy;
      });
      toast.success("User record deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user.");
    }
  };

  const updateItemStatus = async (path: string, id: string, status: string, adminNotes: string) => {
    try {
      await rtdbPatch(`${path}/${id}`, {
        status,
        adminNotes,
        reviewedAt: new Date().toISOString(),
      });
      toast.success("Updated item.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update item.");
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
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

          <TabsContent value="users" className="mt-4 space-y-4">
            {sortedUsers.map(([uid, user]) => (
              <Card key={uid}>
                <CardHeader>
                  <CardTitle className="text-lg">{user.name || "Unnamed User"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>UID:</strong> {uid}</p>
                  <p><strong>Email:</strong> {user.email || "—"}</p>
                  <p><strong>Role:</strong> {user.role || "user"}</p>
                  <p><strong>Created:</strong> {dateLabel(user.createdAt)}</p>
                  <p><strong>Last Login:</strong> {dateLabel(user.lastLogin)}</p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => void updateRole(uid, user.role)}>Toggle Role</Button>
                    <Button size="sm" variant="outline" onClick={() => void deleteUser(uid)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="events" className="mt-4 space-y-4">
            {eventRequests.map((item) => (
              <ModerationCard key={item.id} title={(item.eventName as string) || "Event request"}>
                <p><strong>Category:</strong> {(item.category as string) || "—"}</p>
                <p><strong>Description:</strong> {(item.description as string) || "—"}</p>
                <p><strong>Status:</strong> {(item.status as string) || "pending"}</p>
                <ModerationControls
                  initialNotes={(item.adminNotes as string) || ""}
                  onSave={(status, notes) => void updateItemStatus("event_requests", item.id, status, notes)}
                />
              </ModerationCard>
            ))}
          </TabsContent>

          <TabsContent value="submissions" className="mt-4 space-y-4">
            {questionSubmissions.map((item) => (
              <ModerationCard key={item.id} title={(item.event as string) || "Question submission"}>
                <p><strong>Topic:</strong> {(item.tag as string) || "—"}</p>
                <p><strong>Difficulty:</strong> {(item.difficulty as string) || "—"}</p>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-auto">{JSON.stringify({
                  id: (item.questionId as number) || 0,
                  question: item.question,
                  options: item.options,
                  correctAnswer: item.correctAnswer,
                  category: item.event,
                  difficulty: item.difficulty,
                  explanation: item.explanation,
                  tag: item.tag,
                }, null, 2)}</pre>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(JSON.stringify({
                        question: item.question,
                        options: item.options,
                        correctAnswer: item.correctAnswer,
                        category: item.event,
                        difficulty: item.difficulty,
                        explanation: item.explanation,
                        tag: item.tag,
                      }, null, 2));
                      toast.success("JSON copied.");
                    }}
                  >
                    Copy JSON
                  </Button>
                </div>
                <ModerationControls
                  initialNotes={(item.adminNotes as string) || ""}
                  onSave={(status, notes) => void updateItemStatus("question_submissions", item.id, status, notes)}
                />
              </ModerationCard>
            ))}
          </TabsContent>

          <TabsContent value="reports" className="mt-4 space-y-4">
            {questionReports.map((item) => (
              <ModerationCard key={item.id} title={`Question ${String(item.questionId || "Unknown")}`}>
                <p><strong>Reason:</strong> {(item.reason as string) || "—"}</p>
                <p><strong>Details:</strong> {(item.details as string) || "—"}</p>
                <p><strong>Status:</strong> {(item.status as string) || "pending"}</p>
                <ModerationControls
                  initialNotes={(item.adminNotes as string) || ""}
                  approveLabel="Mark Resolved"
                  rejectLabel="Keep Open"
                  onSave={(status, notes) => void updateItemStatus("question_reports", item.id, status, notes)}
                />
              </ModerationCard>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ModerationCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function ModerationControls({
  initialNotes,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  onSave,
}: {
  initialNotes: string;
  approveLabel?: string;
  rejectLabel?: string;
  onSave: (status: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(initialNotes);

  return (
    <div className="space-y-2">
      <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Admin notes" />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave("approved", notes)}>{approveLabel}</Button>
        <Button size="sm" variant="outline" onClick={() => onSave("rejected", notes)}>{rejectLabel}</Button>
      </div>
    </div>
  );
}
