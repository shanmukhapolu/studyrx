"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

export default function ChapterTestsPage(){
  const { user } = useAuth();
  const [tests, setTests] = useState<Array<{id:string; eventName:string; testName:string; deadlineAt:string; status:string;}>>([]);

  useEffect(()=>{const load=async()=>{if(!user?.uid) return;const me=await rtdbGet<{chapterCode?:string}>(`users/${user.uid}`,{});if(!me.chapterCode)return;const ch=await rtdbGet<ChapterRecord| null>(`chapters/${me.chapterCode}`,null);const rows=Object.entries(ch?.tests||{}).map(([id,t])=>({id,eventName:t.eventName,testName:t.testName,deadlineAt:t.deadlineAt,status:t.status}));setTests(rows.sort((a,b)=>b.deadlineAt.localeCompare(a.deadlineAt)));}; void load(); const i=window.setInterval(()=>void load(),5000); return ()=>window.clearInterval(i)},[user?.uid]);
  const active=tests.filter(t=>t.status!=="completed"); const past=tests.filter(t=>t.status==="completed");
  return <div className="space-y-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Tests</h1><Button asChild><Link href="/chapter-admin/tests/create">Create Test</Link></Button></div><Tabs defaultValue="active"><TabsList><TabsTrigger value="active">Active Tests</TabsTrigger><TabsTrigger value="past">Past Tests</TabsTrigger></TabsList><TabsContent value="active"><div className="space-y-3">{active.length===0?<Card><CardContent className="p-4">No active tests.</CardContent></Card>:active.map(t=><Card key={t.id}><CardHeader><CardTitle>{t.eventName} — {t.testName}</CardTitle></CardHeader><CardContent>Deadline: {new Date(t.deadlineAt).toLocaleString()}</CardContent></Card>)}</div></TabsContent><TabsContent value="past"><div className="space-y-3">{past.length===0?<Card><CardContent className="p-4">No past tests.</CardContent></Card>:past.map(t=><Card key={t.id}><CardHeader><CardTitle>{t.eventName} — {t.testName}</CardTitle></CardHeader><CardContent className="flex justify-between">Finished {new Date(t.deadlineAt).toLocaleString()} <Link className="underline" href={`/chapter-admin/tests/${t.id}/report`}>Open report</Link></CardContent></Card>)}</div></TabsContent></Tabs></div>}
