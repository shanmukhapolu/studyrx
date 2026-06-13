"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarClock, Copy, Sparkles, UserRoundCheck, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

export default function ChapterAdminDashboardPage() {
  const { user } = useAuth();
  const [chapterCode, setChapterCode] = useState("");
  const [chapter, setChapter] = useState<ChapterRecord | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const load = async () => {
      if (!user?.uid) return;
      const me = await rtdbGet<{ chapterCode?: string }>(`users/${user.uid}`, {});
      const code = me.chapterCode || "";
      setChapterCode(code);
      if (!code) return;
      setChapter(await rtdbGet<ChapterRecord | null>(`chapters/${code}`, null));
    };
    void load();
    timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [user?.uid]);

  const memberCount = Object.entries(chapter?.members || {}).filter(([uid, value]) => Boolean(value) && uid !== chapter?.adminUid).length;
  const tests = Object.values(chapter?.tests || {});
  const activeCount = tests.filter((test) => test.status !== "completed").length;
  const completedCount = tests.filter((test) => test.status === "completed").length;
  const latestDeadline = tests.map((test) => test.deadlineAt).filter(Boolean).sort()[0];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 p-6 text-white shadow-lg shadow-blue-500/20">
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-50"><Sparkles className="h-4 w-4" /> Chapter Command Center</p>
            <h2 className="text-3xl font-bold tracking-tight">{chapter?.chapterName || "Your Chapter"}</h2>
            <p className="mt-2 text-blue-50">{chapter?.schoolName || "School not set"} • {chapter?.charterOrganization || "Charter organization not set"}</p>
          </div>
          <div className="rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.25em] text-blue-50">Chapter Code</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="rounded-xl bg-white px-4 py-2 text-2xl font-black tracking-[0.3em] text-blue-700 shadow-sm">{chapterCode || "------"}</code>
              <Button size="icon" variant="secondary" onClick={() => chapterCode && navigator.clipboard.writeText(chapterCode)} aria-label="Copy chapter code">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-blue-100 bg-blue-50/40"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-blue-600" /> Members</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{memberCount}</CardContent></Card>
        <Card className="border-cyan-100 bg-cyan-50/40"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-cyan-600" /> Active Tests</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{activeCount}</CardContent></Card>
        <Card className="border-indigo-100 bg-indigo-50/40"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4 text-indigo-600" /> Completed Tests</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{completedCount}</CardContent></Card>
        <Card className="border-sky-100 bg-sky-50/40"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><UserRoundCheck className="h-4 w-4 text-sky-600" /> Next Deadline</CardTitle></CardHeader><CardContent className="text-sm font-semibold">{latestDeadline ? new Date(latestDeadline).toLocaleString() : "Nothing scheduled"}</CardContent></Card>
      </div>

      <Card className="glass-card tech-border bg-card/80">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Live chapter information synced from your realtime database.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-background/70 p-4"><p className="text-xs text-muted-foreground">School</p><p className="font-semibold">{chapter?.schoolName || "Not set"}</p></div>
          <div className="rounded-2xl border bg-background/70 p-4"><p className="text-xs text-muted-foreground">Charter Organization</p><p className="font-semibold">{chapter?.charterOrganization || "Not set"}</p></div>
          <div className="rounded-2xl border bg-background/70 p-4"><p className="text-xs text-muted-foreground">Chapter Type</p><p className="font-semibold">{chapter?.chapterType || "Not set"}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
