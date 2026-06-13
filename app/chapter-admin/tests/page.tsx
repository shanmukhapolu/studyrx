"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbDelete, rtdbGet, rtdbPatch } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

type TestRow = {
  id: string;
  eventName: string;
  testName: string;
  deadlineAt: string;
  status: string;
};

const preMade = ["MT Practice 1", "MT Practice 2", "Anatomy Drill", "Respiratory Set A"];

export default function ChapterTestsPage() {
  const { user } = useAuth();
  const [chapterCode, setChapterCode] = useState("");
  const [tests, setTests] = useState<TestRow[]>([]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEventName, setEditEventName] = useState("");
  const [editTestName, setEditTestName] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTests = async () => {
    if (!user?.uid) return;
    const me = await rtdbGet<{ chapterCode?: string }>(`users/${user.uid}`, {});
    if (!me.chapterCode) return;
    setChapterCode(me.chapterCode);
    const ch = await rtdbGet<ChapterRecord | null>(`chapters/${me.chapterCode}`, null);
    const rows = Object.entries(ch?.tests || {}).map(([id, t]) => ({
      id,
      eventName: t.eventName,
      testName: t.testName,
      deadlineAt: t.deadlineAt,
      status: t.status,
    }));
    setTests(rows.sort((a, b) => b.deadlineAt.localeCompare(a.deadlineAt)));
  };

  useEffect(() => {
    void loadTests();
    const interval = window.setInterval(() => void loadTests(), 5000);
    return () => window.clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const active = tests.filter((t) => t.status !== "completed");
  const past = tests.filter((t) => t.status === "completed");

  const startEdit = (test: TestRow) => {
    setEditingId(test.id);
    setEditEventName(test.eventName);
    setEditTestName(test.testName);
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
      await loadTests();
    } finally {
      setSaving(false);
    }
  };

  const deleteTest = async (testId: string) => {
    if (!chapterCode) return;
    if (!confirm("Delete this test? This cannot be undone.")) return;
    await rtdbDelete(`chapters/${chapterCode}/tests/${testId}`);
    await loadTests();
  };

  const renderTestCard = (test: TestRow, showReport = false) => {
    if (editingId === test.id) {
      return (
        <Card key={test.id}>
          <CardHeader>
            <CardTitle className="text-base">Edit Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
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
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={test.id}>
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <CardTitle className="text-base leading-snug">{test.eventName} &mdash; {test.testName}</CardTitle>
          <div className="flex shrink-0 gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(test)} title="Edit test">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTest(test.id)} title="Delete test">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{showReport ? "Finished" : "Deadline:"} {new Date(test.deadlineAt).toLocaleString()}</span>
          {showReport && (
            <Link className="text-primary underline-offset-4 hover:underline" href={`/chapter-admin/tests/${test.id}/report`}>
              Open report
            </Link>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tests</h1>
        <Button asChild><Link href="/chapter-admin/tests/create">Create Test</Link></Button>
      </div>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Tests</TabsTrigger>
          <TabsTrigger value="past">Past Tests</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <div className="space-y-3">
            {active.length === 0 ? (
              <Card><CardContent className="p-4">No active tests.</CardContent></Card>
            ) : (
              active.map((t) => renderTestCard(t, false))
            )}
          </div>
        </TabsContent>
        <TabsContent value="past">
          <div className="space-y-3">
            {past.length === 0 ? (
              <Card><CardContent className="p-4">No past tests.</CardContent></Card>
            ) : (
              past.map((t) => renderTestCard(t, true))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
