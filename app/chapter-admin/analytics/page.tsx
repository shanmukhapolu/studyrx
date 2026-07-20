"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CheckCircle2, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

function MetricValue({ value, suffix = "" }: { value: string | null; suffix?: string }) {
  return value ? <span className="text-3xl font-bold">{value}{suffix}</span> : <span className="text-sm text-muted-foreground">Nothing yet here</span>;
}

export default function ChapterAnalyticsPage(){const {user}=useAuth(); const [chapter,setChapter]=useState<ChapterRecord|null>(null);
useEffect(()=>{const load=async()=>{if(!user?.uid)return;const me=await rtdbGet<{chapterCode?:string}>(`users/${user.uid}`,{});if(!me.chapterCode)return;const ch=await rtdbGet<ChapterRecord|null>(`chapters/${me.chapterCode}`,null);setChapter(ch);}; void load(); const i=window.setInterval(()=>void load(),5000); return ()=>window.clearInterval(i)},[user?.uid]);
const stats=useMemo(()=>{const tests=Object.values(chapter?.tests||{}); let attempts=0, sumScore=0, sumAcc=0, completedAssignments=0, assignedTotal=0; for(const t of tests){const rs=Object.values(t.results||{}); attempts+=rs.length; rs.forEach(r=>{sumScore+=r.score||0; sumAcc+=r.accuracy||0;}); completedAssignments += rs.length; assignedTotal += Object.values(t.assignedMembers||{}).filter(Boolean).length;} return {avgScore:attempts? (sumScore/attempts).toFixed(1):null, avgAcc:attempts? (sumAcc/attempts).toFixed(1):null, attempts:attempts? String(attempts):null, completionRate: assignedTotal? ((completedAssignments/assignedTotal)*100).toFixed(1):null};},[chapter]);
return <div className="grid gap-4 md:grid-cols-2"><Card className="border-blue-100 bg-blue-50/30"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-blue-600" />Average Score</CardTitle></CardHeader><CardContent><MetricValue value={stats.avgScore} /></CardContent></Card><Card className="border-cyan-100 bg-cyan-50/30"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-cyan-600" />Average Accuracy</CardTitle></CardHeader><CardContent><MetricValue value={stats.avgAcc} suffix="%" /></CardContent></Card><Card className="border-indigo-100 bg-indigo-50/30"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4 text-indigo-600" />Total Attempts</CardTitle></CardHeader><CardContent><MetricValue value={stats.attempts} /></CardContent></Card><Card className="border-sky-100 bg-sky-50/30"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-sky-600" />Completion Rate</CardTitle></CardHeader><CardContent><MetricValue value={stats.completionRate} suffix="%" /></CardContent></Card></div>}
