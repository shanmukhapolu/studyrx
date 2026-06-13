"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Pencil, School, ShieldCheck, Trash2, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbDelete, rtdbGet, rtdbPatch } from "@/lib/rtdb";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import type { ChapterRecord } from "@/lib/chapter";

type UserData = { name?: string; email?: string; grade?: string; chapterCode?: string };
type MemberRow = { uid: string; name: string; email: string; grade: string };
type TestRow = {
  id: string;
  eventName: string;
  testName: string;
  deadlineAt: string;
  status: string;
  assignedMembers?: Record<string, boolean>;
};

const preMade = ["MT Practice 1", "MT Practice 2", "Anatomy Drill", "Respiratory Set A"];

export default function ChapterPage() {
  const { user } = useAuth();
  const [chapterCode, setChapterCode] = useState("");
  const [chapter, setChapter] = useState<ChapterRecord | null>(null);
  const [adminName, setAdminName] = useState("-");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [allTests, setAllTests] = useState<TestRow[]>([]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editTestName, setEditTestName] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!user?.uid) return;
    const userRecord = await rtdbGet<UserData>(`users/${user.uid}`, {});
    const code = typeof userRecord.chapterCode === "string" ? userRecord.chapterCode : "";
    setChapterCode(code);
    if (!code) return;

    const chapterData = await rtdbGet<ChapterRecord | null>(`chapters/${code}`, null);
    setChapter(chapterData);
    if (!chapterData) return;

    if (!chapterData.members?.[user.uid]) {
      await rtdbPatch(`chapters/${code}/members`, { [user.uid]: { joinedAt: new Date().toISOString(), role: "Member" } });
    }

    if (chapterData.adminUid) {
      const adminRecord = await rtdbGet<UserData>(`users/${chapterData.adminUid}`, {});
      setAdminName(adminRecord.name || "-");
    }

    const memberIds = Object.keys(chapterData.members || {}).filter(
      (uid) => Boolean(chapterData.members?.[uid]) && uid !== chapterData.adminUid
    );
    const rows = await Promise.all(
      memberIds.map(async (uid) => {
        const member = await rtdbGet<UserData>(`users/${uid}`, {});
        return { uid, name: member.name || "Unnamed member", email: member.email || "-", grade: member.grade || "-" };
      })
    );
    setMembers(rows);

    const testRows = Object.entries(chapterData.tests || {}).map(([id, t]) => ({
      id,
      eventName: t.eventName,
      testName: t.testName,
      deadlineAt: t.deadlineAt,
      status: t.status,
      assignedMembers: t.assignedMembers,
    }));
    setAllTests(testRows.sort((a, b) => b.deadlineAt.localeCompare(a.deadlineAt)));
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const myTests = allTests.filter((t) => Boolean(t.assignedMembers?.[user?.uid || ""]));
  const activeTests = myTests.filter((t) => t.status !== "completed");
  const pastTests = myTests.filter((t) => t.status === "completed");

  const startEdit = (test: TestRow) => {
    setEditingId(test.id);
    setEditEventName(test.eventName);
    setEditTestName(test.testName);
    // Convert ISO to datetime-local format
    const local = test.deadlineAt ? new Date(test.deadlineAt).toISOString().slice(0, 16) : "";
    setEditDeadline(local);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (testId: string) => {
    if (!chapterCode) return;
    setSaving(true);
    try {
      await rtdbPatch(`chapters/${chapterCode}/tests/${testId}`, {
        eventName: editEventName,
        testName: editTestName,
        deadlineAt: new Date(editDeadline).toISOString(),
      });
      setEditingId(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const deleteTest = async (testId: string) => {
    if (!chapterCode) return;
    if (!confirm("Delete this test? This cannot be undone.")) return;
    await rtdbDelete(`chapters/${chapterCode}/tests/${testId}`);
    await loadData();
  };

  if (!chapterCode) {
    return (
      <div className="flex min-h-screen w-full">
        <SidebarProvider>
          <AuthGuard>
            <AppSidebar />
            <SidebarInset>
              <div className="p-6">
                <h1 className="text-2xl font-bold">Chapter</h1>
                <p className="text-muted-foreground mt-2">
                  You are not in a chapter yet. Use the dashboard Join Chapter box to add a valid chapter code.
                </p>
              </div>
            </SidebarInset>
          </AuthGuard>
        </SidebarProvider>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <SidebarProvider>
        <AuthGuard>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col flex-1">
              {/* Header */}
              <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center gap-3 px-4 md:gap-4 md:px-6">
                  <SidebarTrigger className="md:hidden" />
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-foreground md:text-2xl">Chapter</h1>
                    <p className="text-sm text-muted-foreground">{chapter?.chapterName || "Your Chapter"}</p>
                  </div>
                </div>
              </header>

              <main className="flex-1 p-4 md:p-6 space-y-6">
                {/* Hero banner */}
                <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 p-6 text-white shadow-lg shadow-blue-500/20">
                  <p className="mb-2 text-sm font-medium text-blue-50">Chapter Dashboard</p>
                  <h1 className="text-3xl font-black tracking-tight">{chapter?.chapterName || "Your Chapter"}</h1>
                  <p className="mt-2 text-blue-50">{chapter?.schoolName || "School not set"} &bull; Code {chapterCode}</p>
                </section>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-blue-100 bg-blue-50/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-blue-600" />Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">{members.length}</CardContent>
                  </Card>
                  <Card className="border-cyan-100 bg-cyan-50/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <CalendarClock className="h-4 w-4 text-cyan-600" />Active Tests
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-3xl font-bold">{activeTests.length}</CardContent>
                  </Card>
                  <Card className="border-indigo-100 bg-indigo-50/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />Chapter Admin
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm font-semibold">
                      {adminName}
                      {chapter?.adminRole ? <span className="ml-1 font-normal text-muted-foreground">({chapter.adminRole})</span> : null}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-[7fr_3fr]">
                  {/* Tests */}
                  <div className="space-y-4">
                    {/* Active tests */}
                    <Card>
                      <CardHeader><CardTitle>Assigned Tests</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {activeTests.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No active assigned tests.</p>
                        ) : (
                          activeTests.map((test) =>
                            editingId === test.id ? (
                              <div key={test.id} className="rounded-2xl border bg-blue-50/30 p-4 space-y-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs font-medium mb-1">Event</p>
                                    <Input value={editEventName} onChange={(e) => setEditEventName(e.target.value)} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium mb-1">Test Name</p>
                                    <select
                                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={editTestName}
                                      onChange={(e) => setEditTestName(e.target.value)}
                                    >
                                      {preMade.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium mb-1">Deadline</p>
                                  <Input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveEdit(test.id)} disabled={saving}>
                                    {saving ? "Saving…" : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div key={test.id} className="rounded-2xl border bg-blue-50/30 p-4 flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold">{test.eventName} &mdash; {test.testName}</p>
                                  <p className="text-sm text-muted-foreground">Deadline: {new Date(test.deadlineAt).toLocaleString()}</p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(test)} title="Edit test">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTest(test.id)} title="Delete test">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )
                          )
                        )}
                      </CardContent>
                    </Card>

                    {/* Past tests */}
                    <Card>
                      <CardHeader><CardTitle>Past Tests</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {pastTests.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No past tests yet.</p>
                        ) : (
                          pastTests.map((test) => (
                            <div key={test.id} className="rounded-2xl border p-4 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{test.eventName} &mdash; {test.testName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Completed after {new Date(test.deadlineAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                onClick={() => deleteTest(test.id)}
                                title="Delete test"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <Card className="border-blue-100">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <School className="h-5 w-5 text-blue-600" />Chapter Info
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><span className="font-medium">School:</span> {chapter?.schoolName || "-"}</p>
                        <p><span className="font-medium">Charter:</span> {chapter?.charterOrganization || "-"}</p>
                        <p><span className="font-medium">Chapter Admin:</span> {adminName}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Members</CardTitle></CardHeader>
                      <CardContent>
                        {members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No student members yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {members.map((member) => (
                              <div key={member.uid} className="rounded-xl border bg-card/70 p-3">
                                <p className="font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.grade} &bull; {member.email}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </main>
            </div>
          </SidebarInset>
        </AuthGuard>
      </SidebarProvider>
    </div>
  );
}
