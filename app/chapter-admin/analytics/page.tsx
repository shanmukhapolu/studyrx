"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

export default function ChapterAnalyticsPage(){const {user}=useAuth(); const [chapter,setChapter]=useState<ChapterRecord|null>(null);
useEffect(()=>{const load=async()=>{if(!user?.uid)return;const me=await rtdbGet<{chapterCode?:string}>(`users/${user.uid}`,{});if(!me.chapterCode)return;const ch=await rtdbGet<ChapterRecord|null>(`chapters/${me.chapterCode}`,null);setChapter(ch);}; void load(); const i=window.setInterval(()=>void load(),5000); return ()=>window.clearInterval(i)},[user?.uid]);
const stats=useMemo(()=>{const tests=Object.values(chapter?.tests||{}); let attempts=0, sumScore=0, sumAcc=0, completed=0; const memberCount=Object.values(chapter?.members||{}).filter(Boolean).length; for(const t of tests){const rs=Object.values(t.results||{}); attempts+=rs.length; rs.forEach(r=>{sumScore+=r.score||0; sumAcc+=r.accuracy||0;}); if(t.status==="completed") completed++;} return {tests:tests.length, attempts, avgScore:attempts? (sumScore/attempts).toFixed(1):null, avgAcc:attempts? (sumAcc/attempts).toFixed(1):null, completionRate: tests.length&&memberCount? ((completed/tests.length)*100).toFixed(1):null};},[chapter]);
return <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Average Score</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.avgScore??"Nothing yet here"}</CardContent></Card><Card><CardHeader><CardTitle>Average Accuracy</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.avgAcc?`${stats.avgAcc}%`:"Nothing yet here"}</CardContent></Card><Card><CardHeader><CardTitle>Total Attempts</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.attempts||"Nothing yet here"}</CardContent></Card><Card><CardHeader><CardTitle>Completion Rate</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.completionRate?`${stats.completionRate}%`:"Nothing yet here"}</CardContent></Card></div>}
