"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet } from "@/lib/rtdb";

type ChapterData = {
  chapterName?: string;
  schoolName?: string;
  charterOrganization?: string;
  adminUid?: string;
  adminRole?: string;
  members?: Record<string, boolean>;
};

type UserData = {
  name?: string;
  chapterCode?: string;
};

export default function ChapterPage() {
  const { user } = useAuth();
  const [chapterCode, setChapterCode] = useState("");
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [advisorName, setAdvisorName] = useState("-");
  const [memberNames, setMemberNames] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      const userRecord = await rtdbGet<UserData>(`users/${user.uid}`, {});
      const code = typeof userRecord.chapterCode === "string" ? userRecord.chapterCode : "";
      setChapterCode(code);
      if (!code) return;

      const chapterData = await rtdbGet<ChapterData | null>(`chapters/${code}`, null);
      setChapter(chapterData);
      if (!chapterData) return;

      if (chapterData.adminUid) {
        const adminRecord = await rtdbGet<UserData>(`users/${chapterData.adminUid}`, {});
        setAdvisorName(adminRecord.name || "-");
      }

      const memberIds = Object.keys(chapterData.members || {}).filter((uid) => chapterData.members?.[uid]);
      const users = await Promise.all(memberIds.map((uid) => rtdbGet<UserData>(`users/${uid}`, {})));
      setMemberNames(users.map((u) => u.name || "Unnamed member"));
    };
    load();
  }, [user?.uid]);

  if (!chapterCode) {
    return <div className="p-6"><h1 className="text-2xl font-bold">Chapter</h1><p className="text-muted-foreground mt-2">You are not in a chapter yet. Use the dashboard Join Chapter box to add a valid chapter code.</p></div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Chapter Dashboard</h1>
      <Card>
        <CardHeader><CardTitle>Chapter Info</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <p><span className="font-medium">Code:</span> {chapterCode}</p>
          <p><span className="font-medium">Name:</span> {chapter?.chapterName || "-"}</p>
          <p><span className="font-medium">School:</span> {chapter?.schoolName || "-"}</p>
          <p><span className="font-medium">Charter Organization:</span> {chapter?.charterOrganization || "-"}</p>
          <p><span className="font-medium">Advisor / Admin:</span> {advisorName} ({chapter?.adminRole || "-"})</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent>
          {memberNames.length === 0 ? <p className="text-muted-foreground">No members found.</p> : <ul className="list-disc pl-5">{memberNames.map((name) => <li key={name}>{name}</li>)}</ul>}
        </CardContent>
      </Card>
    </div>
  );
}
