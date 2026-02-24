"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-provider";
import { HOSA_EVENTS } from "@/lib/events";
import { deleteQuestion, deleteUser, getAllQuestions, getAllUsers, resetUserPassword, saveQuestion, updateUserName, type AdminQuestion, type ManagedUser } from "@/lib/admin";
import type { Question } from "@/lib/storage";

type DraftQuestion = Pick<Question, "id" | "question" | "options" | "correctAnswer" | "category" | "difficulty" | "explanation"> & { eventId: string };

const defaultQuestion: DraftQuestion = {
  id: "",
  eventId: HOSA_EVENTS[0]?.id || "",
  question: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  category: "Cell Biology & Genetics" as const,
  difficulty: "Easy" as const,
  explanation: "",
};

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [draft, setDraft] = useState<DraftQuestion>(defaultQuestion);
  const [query, setQuery] = useState("");
  const tab = params.get("tab") || "users";

  useEffect(() => {
    if (!isAdmin) return;
    void Promise.all([getAllUsers(), getAllQuestions()]).then(([u, q]) => {
      setUsers(u);
      setQuestions(q);
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  const filteredQuestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter((item) => !q || [item.question, item.explanation, item.category, item.correctAnswer, ...item.options].join(" ").toLowerCase().includes(q));
  }, [questions, query]);

  const analytics = useMemo(() => ({
    totalUsers: users.length,
    totalQuestions: questions.length,
    totalPracticeSeconds: users.reduce((s, u) => s + u.totalPracticeSeconds, 0),
    activeUsers: users.filter((u) => u.lastLoginAt && Date.now() - new Date(u.lastLoginAt).getTime() <= 14 * 24 * 3600 * 1000).length,
  }), [questions.length, users]);

  const upsertQuestion = async (e: FormEvent) => {
    e.preventDefault();
    const id = draft.id || `${draft.eventId}::${crypto.randomUUID().slice(0, 8)}`;
    await saveQuestion({ ...draft, id, correctAnswer: draft.correctAnswer || draft.options[0] } as any);
    setDraft(defaultQuestion);
    setQuestions(await getAllQuestions());
  };

  return (
    <SidebarProvider>
      <AuthGuard>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen p-6 bg-gradient-to-b from-amber-500/5 to-background">
            <h1 className="text-2xl font-bold mb-4">Admin Control Center</h1>
            <Tabs value={tab} onValueChange={(next) => router.replace(`/admin?tab=${next}`)}>
              <TabsList>
                <TabsTrigger value="users">User management</TabsTrigger>
                <TabsTrigger value="questions">Question management</TabsTrigger>
                <TabsTrigger value="analytics">Site analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="space-y-4">{users.map((user) => <Card key={user.uid}><CardContent className="py-4 flex flex-wrap justify-between gap-3"><div className="text-sm"><p className="font-semibold">{user.name} ({user.email || "no email"})</p><p>Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"} · Logins: {user.loginCount} · Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</p><p>Practice time: {(user.totalPracticeSeconds / 60).toFixed(1)} min</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => resetUserPassword(user.email)}>Reset password</Button><Button variant="outline" onClick={async () => { const n = window.prompt("New name", user.name); if (!n) return; await updateUserName(user.uid, n); setUsers(await getAllUsers()); }}>Edit name</Button><Button variant="destructive" onClick={async () => { if (!window.confirm("Delete user and all data?")) return; await deleteUser(user.uid); setUsers(await getAllUsers()); }}>Delete</Button></div></CardContent></Card>)}</TabsContent>
              <TabsContent value="questions" className="space-y-4">
                <Card><CardHeader><CardTitle>Create / edit question</CardTitle></CardHeader><CardContent><form onSubmit={upsertQuestion} className="grid gap-2 md:grid-cols-2"><Input placeholder="Question ID (optional)" value={draft.id} onChange={(e) => setDraft((p) => ({ ...p, id: e.target.value }))} /><select className="border rounded-md px-3" value={draft.eventId} onChange={(e) => setDraft((p) => ({ ...p, eventId: e.target.value }))}>{HOSA_EVENTS.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select><Input className="md:col-span-2" placeholder="Question" value={draft.question} onChange={(e) => setDraft((p) => ({ ...p, question: e.target.value }))} required />{draft.options.map((option, index) => <Input key={index} placeholder={`Option ${index + 1}`} value={option} onChange={(e) => setDraft((p) => ({ ...p, options: p.options.map((o, i) => i === index ? e.target.value : o) }))} required />)}<Input placeholder="Correct answer" value={draft.correctAnswer} onChange={(e) => setDraft((p) => ({ ...p, correctAnswer: e.target.value }))} required /><Input placeholder="Category" value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value as any }))} required /><select className="border rounded-md px-3" value={draft.difficulty} onChange={(e) => setDraft((p) => ({ ...p, difficulty: e.target.value as any }))}><option>Easy</option><option>Medium</option><option>Hard</option></select><Input className="md:col-span-2" placeholder="Explanation" value={draft.explanation} onChange={(e) => setDraft((p) => ({ ...p, explanation: e.target.value }))} required /><Button className="md:col-span-2" type="submit">Save question</Button></form></CardContent></Card>
                <Input placeholder="Search question, answers, explanation, topic..." value={query} onChange={(e) => setQuery(e.target.value)} />
                {filteredQuestions.map((question) => <Card key={question.id}><CardContent className="py-4 flex justify-between gap-2"><div><p className="font-medium">[{question.eventId}] {question.question}</p><p className="text-sm text-muted-foreground">{question.difficulty} · {question.category} · Accuracy {question.averageAccuracy.toFixed(1)}%</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setDraft({ id: question.id, eventId: question.eventId, question: question.question, options: question.options, correctAnswer: question.correctAnswer, category: question.category, difficulty: question.difficulty, explanation: question.explanation })}>Edit</Button><Button variant="destructive" onClick={async () => { await deleteQuestion(question.id); setQuestions(await getAllQuestions()); }}>Delete</Button></div></CardContent></Card>)}
              </TabsContent>
              <TabsContent value="analytics" className="space-y-4"><Card><CardContent className="py-4 text-sm space-y-1"><p>Total users: {analytics.totalUsers}</p><p>Total questions: {analytics.totalQuestions}</p><p>Total practice time: {(analytics.totalPracticeSeconds / 3600).toFixed(2)} hours</p><p>Active users (14 days): {analytics.activeUsers}</p></CardContent></Card></TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </AuthGuard>
    </SidebarProvider>
  );
}
