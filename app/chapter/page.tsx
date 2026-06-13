"use client";

import { useEffect, useState } from "react";
import { CalendarClock, School, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet, rtdbPatch } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

type UserData = { name?: string; email?: string; grade?: string; chapterCode?: string };
type MemberRow = { uid: string; name: string; email: string; grade: string };

export default function ChapterPage() {
  const { user } = useAuth();
  const [chapterCode, setChapterCode] = useState("");
  const [chapter, setChapter] = useState<ChapterRecord | null>(null);
  const [advisorName, setAdvisorName] = useState("-");
  const [members, setMembers] = useState<MemberRow[]>([]);

  useEffect(() => {
    const load = async () => {
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
        setAdvisorName(adminRecord.name || "-");
      }

      const memberIds = Object.keys(chapterData.members || {}).filter((uid) => Boolean(chapterData.members?.[uid]) && uid !== chapterData.adminUid);
      const rows = await Promise.all(memberIds.map(async (uid) => {
        const member = await rtdbGet<UserData>(`users/${uid}`, {});
        return { uid, name: member.name || "Unnamed member", email: member.email || "-", grade: member.grade || "-" };
      }));
      setMembers(rows);
    };
    void load();
  }, [user?.uid]);

  const tests = Object.entries(chapter?.tests || {}).map(([id, test]) => ({ id, ...test })).filter((test) => Boolean(test.assignedMembers?.[user?.uid || ""]));
  const activeTests = tests.filter((test) => test.status !== "completed");
  const pastTests = tests.filter((test) => test.status === "completed");

  if (!chapterCode) {
    return <div className="p-6"><h1 className="text-2xl font-bold">Chapter</h1><p className="text-muted-foreground mt-2">You are not in a chapter yet. Use the dashboard Join Chapter box to add a valid chapter code.</p></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 p-6 text-white shadow-lg shadow-blue-500/20">
        <p className="mb-2 text-sm font-medium text-blue-50">Chapter Dashboard</p>
        <h1 className="text-3xl font-black tracking-tight">{chapter?.chapterName || "Your Chapter"}</h1>
        <p className="mt-2 text-blue-50">{chapter?.schoolName || "School not set"} • Code {chapterCode}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-100 bg-blue-50/40"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-blue-600" />Members</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{members.length}</CardContent></Card>
        <Card className="border-cyan-100 bg-cyan-50/40"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-cyan-600" />Active Tests</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{activeTests.length}</CardContent></Card>
        <Card className="border-indigo-100 bg-indigo-50/40"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-indigo-600" />Advisor</CardTitle></CardHeader><CardContent className="text-sm font-semibold">{advisorName} ({chapter?.adminRole || "Advisor"})</CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[7fr_3fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Assigned Tests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activeTests.length === 0 ? <p className="text-sm text-muted-foreground">No active assigned tests.</p> : activeTests.map((test) => <div key={test.id} className="rounded-2xl border bg-blue-50/30 p-4"><p className="font-semibold">{test.eventName} — {test.testName}</p><p className="text-sm text-muted-foreground">Deadline: {new Date(test.deadlineAt).toLocaleString()}</p></div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Past Tests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {pastTests.length === 0 ? <p className="text-sm text-muted-foreground">No past tests yet.</p> : pastTests.map((test) => <div key={test.id} className="rounded-2xl border p-4"><p className="font-semibold">{test.eventName} — {test.testName}</p><p className="text-sm text-muted-foreground">Completed after {new Date(test.deadlineAt).toLocaleDateString()}</p></div>)}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-blue-100">
            <CardHeader><CardTitle className="flex items-center gap-2"><School className="h-5 w-5 text-blue-600" />Chapter Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="font-medium">School:</span> {chapter?.schoolName || "-"}</p>
              <p><span className="font-medium">Charter:</span> {chapter?.charterOrganization || "-"}</p>
              <p><span className="font-medium">Advisor:</span> {advisorName}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Members</CardTitle></CardHeader>
            <CardContent>{members.length === 0 ? <p className="text-sm text-muted-foreground">No student members yet.</p> : <div className="space-y-2">{members.map((member) => <div key={member.uid} className="rounded-xl border bg-card/70 p-3"><p className="font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.grade} • {member.email}</p></div>)}</div>}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
