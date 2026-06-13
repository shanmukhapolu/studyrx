"use client";

import { useEffect, useState } from "react";
import { Copy, MoreHorizontal, UserMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet, rtdbPatch, rtdbSet } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

type ChapterMemberValue = boolean | { joinedAt?: string; role?: string };
type MemberRow = { uid: string; name: string; email: string; grade: string; joinedAt: string; role: string; isChapterAccount: boolean };

function joinedAtFrom(value: ChapterMemberValue) {
  if (value && typeof value === "object" && typeof value.joinedAt === "string") return value.joinedAt;
  return "";
}

function roleFrom(value: ChapterMemberValue, isChapterAccount: boolean) {
  if (value && typeof value === "object" && typeof value.role === "string") return value.role;
  return isChapterAccount ? "Chapter Admin" : "Member";
}

export default function ChapterMembersPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [editingUid, setEditingUid] = useState("");
  const [draftName, setDraftName] = useState("");

  const load = async () => {
    if (!user?.uid) return;
    const me = await rtdbGet<{ chapterCode?: string }>(`users/${user.uid}`, {});
    if (!me.chapterCode) return;
    setCode(me.chapterCode);
    const chapter = await rtdbGet<(ChapterRecord & { members?: Record<string, ChapterMemberValue> }) | null>(`chapters/${me.chapterCode}`, null);
    const entries = Object.entries(chapter?.members || {}).filter(([, value]) => Boolean(value));
    const rows = await Promise.all(entries.map(async ([uid, memberValue]) => {
      const isChapterAccount = uid === chapter?.adminUid;
      const member = await rtdbGet<{ name?: string; email?: string; grade?: string }>(`users/${uid}`, {});
      return {
        uid,
        name: member.name || "Unnamed member",
        email: member.email || "-",
        grade: member.grade || "-",
        joinedAt: joinedAtFrom(memberValue) || "Unknown",
        role: roleFrom(memberValue, isChapterAccount),
        isChapterAccount,
      };
    }));
    setMembers(rows);
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(interval);
  }, [user?.uid]);

  const removeMember = async (uid: string) => {
    if (!code) return;
    await rtdbPatch(`chapters/${code}/members`, { [uid]: null });
    await rtdbSet(`users/${uid}/chapterCode`, "");
    await load();
  };

  const saveName = async (uid: string) => {
    if (!draftName.trim()) return;
    await rtdbSet(`users/${uid}/name`, draftName.trim());
    setEditingUid("");
    setDraftName("");
    await load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[7fr_3fr]">
      <Card className="overflow-hidden border-blue-100 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardTitle>Member Management</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No users.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.uid} className="border-t bg-card/60 hover:bg-blue-50/40">
                      <td className="px-4 py-3 font-medium">
                        {editingUid === member.uid ? <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="h-8" /> : member.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{member.role}</span></td>
                      <td className="px-4 py-3">{member.grade}</td>
                      <td className="px-4 py-3 text-muted-foreground">{member.joinedAt === "Unknown" ? "Unknown" : new Date(member.joinedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {member.isChapterAccount ? (
                          <span className="text-xs text-muted-foreground">Protected</span>
                        ) : (
                          <details className="relative inline-block">
                            <summary className="list-none rounded-full p-2 hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></summary>
                            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border bg-popover p-2 text-left shadow-lg">
                              {editingUid === member.uid ? (
                                <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => saveName(member.uid)}>Save name</Button>
                              ) : (
                                <Button size="sm" variant="ghost" className="w-full justify-start" onClick={() => { setEditingUid(member.uid); setDraftName(member.name); }}>Edit name</Button>
                              )}
                              <Button size="sm" variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => removeMember(member.uid)}><UserMinus className="mr-2 h-4 w-4" />Remove from chapter</Button>
                            </div>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="h-fit border-blue-100 bg-gradient-to-br from-blue-50 to-background">
        <CardHeader><CardTitle>Invite New Members</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Share this chapter code with members. They can enter it from their dashboard and will immediately get the Chapter page in their sidebar.</p>
          <div className="flex items-center gap-2 rounded-2xl border bg-white p-3">
            <code className="flex-1 text-xl font-black tracking-[0.25em] text-blue-700">{code || "-"}</code>
            <Button size="icon" variant="secondary" onClick={() => code && navigator.clipboard.writeText(code)}><Copy className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
