"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

export default function ChapterAdminDashboardPage() {
  const { user } = useAuth();
  const [chapterCode, setChapterCode] = useState("");
  const [chapter, setChapter] = useState<ChapterRecord | null>(null);

  useEffect(() => {
    let t: number | undefined;
    const load = async () => {
      if (!user?.uid) return;
      const me = await rtdbGet<{ chapterCode?: string }>(`users/${user.uid}`, {});
      const code = me.chapterCode || "";
      setChapterCode(code);
      if (!code) return;
      const data = await rtdbGet<ChapterRecord | null>(`chapters/${code}`, null);
      setChapter(data);
    };
    void load();
    t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, [user?.uid]);

  const memberCount = Object.values(chapter?.members || {}).filter(Boolean).length;
  const tests = Object.values(chapter?.tests || {});
  const activeCount = tests.filter((t) => t.status !== "completed").length;

  return (
    <div className="space-y-4">
      <Card className="glass-card tech-border bg-card/70">
        <CardHeader><CardTitle>Chapter Info</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <p><span className="font-semibold">Chapter Name:</span> {chapter?.chapterName || "-"}</p>
          <p><span className="font-semibold">School:</span> {chapter?.schoolName || "-"}</p>
          <p><span className="font-semibold">Charter Organization:</span> {chapter?.charterOrganization || "-"}</p>
          <div className="flex items-center gap-2"><span className="font-semibold">Chapter Code:</span> <code>{chapterCode || "-"}</code><Button size="icon" variant="ghost" onClick={() => chapterCode && navigator.clipboard.writeText(chapterCode)}><Copy className="h-4 w-4" /></Button></div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total Members</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{memberCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Active Tests</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{activeCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Tests</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{tests.length}</CardContent></Card>
      </div>
    </div>
  );
}
