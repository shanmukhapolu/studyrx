"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet, rtdbPatch } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

const preMade=["MT Practice 1","MT Practice 2","Anatomy Drill","Respiratory Set A"];

export default function CreateTestPage(){const {user}=useAuth(); const router=useRouter(); const [chapterCode,setChapterCode]=useState(""); const [members,setMembers]=useState<Array<{uid:string;name:string}>>([]); const [eventName,setEventName]=useState("Medical Terminology"); const [testName,setTestName]=useState(preMade[0]); const [deadlineAt,setDeadlineAt]=useState(""); const [selected,setSelected]=useState<Record<string,boolean>>({});
useEffect(()=>{const load=async()=>{if(!user?.uid)return;const me=await rtdbGet<{chapterCode?:string}>(`users/${user.uid}`,{});if(!me.chapterCode)return;setChapterCode(me.chapterCode);const ch=await rtdbGet<ChapterRecord|null>(`chapters/${me.chapterCode}`,null);const ids=Object.keys(ch?.members||{}).filter(id=>Boolean(ch?.members?.[id]) && id !== ch?.adminUid);const rows=await Promise.all(ids.map(async(uid)=>{const u=await rtdbGet<{name?:string;role?:string}>(`users/${uid}`,{});return {uid,name:u.name||uid};})); setMembers(rows); setSelected(Object.fromEntries(rows.map(r=>[r.uid,true])));}; void load();},[user?.uid]);
const assigned=useMemo(()=>Object.fromEntries(Object.entries(selected).filter(([,v])=>v)),[selected]);
const submit=async()=>{if(!chapterCode||!deadlineAt) return; const id=`test_${Date.now()}`; await rtdbPatch(`chapters/${chapterCode}/tests/${id}`,{eventName,testName,deadlineAt,status:"active",assignedMembers:assigned,createdAt:new Date().toISOString()}); router.push('/chapter-admin/tests');};
return <Card><CardHeader><CardTitle>Create Test</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="text-sm mb-1">Event</p><Input value={eventName} onChange={(e)=>setEventName(e.target.value)} /></div><div><p className="text-sm mb-1">Pre-made Test</p><select className="w-full border rounded p-2" value={testName} onChange={(e)=>setTestName(e.target.value)}>{preMade.map(t=><option key={t}>{t}</option>)}</select></div><div><p className="text-sm mb-1">Assign Members</p><div className="max-h-52 overflow-auto border rounded p-2 space-y-2">{members.length===0?<p className="text-sm text-muted-foreground">No student members available.</p>:members.map(m=><label key={m.uid} className="flex items-center gap-2"><input type="checkbox" checked={!!selected[m.uid]} onChange={(e)=>setSelected((p)=>({...p,[m.uid]:e.target.checked}))} />{m.name}</label>)}</div></div><div><p className="text-sm mb-1">Deadline</p><Input type="datetime-local" value={deadlineAt} onChange={(e)=>setDeadlineAt(e.target.value)} /></div><Button onClick={submit}>Create Test</Button></CardContent></Card>}
