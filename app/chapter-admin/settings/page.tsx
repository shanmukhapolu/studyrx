"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet, rtdbPatch } from "@/lib/rtdb";

export default function ChapterSettingsPage(){const {user}=useAuth(); const [code,setCode]=useState(""); const [chapterName,setChapterName]=useState(""); const [schoolName,setSchoolName]=useState(""); const [charterOrganization,setCharterOrganization]=useState("");
useEffect(()=>{const load=async()=>{if(!user?.uid)return; const me=await rtdbGet<{chapterCode?:string}>(`users/${user.uid}`,{}); if(!me.chapterCode) return; setCode(me.chapterCode); const ch=await rtdbGet<{chapterName?:string;schoolName?:string;charterOrganization?:string}>(`chapters/${me.chapterCode}`,{}); setChapterName(ch.chapterName||""); setSchoolName(ch.schoolName||""); setCharterOrganization(ch.charterOrganization||"");}; void load();},[user?.uid]);
const save=async()=>{if(!code) return; await rtdbPatch(`chapters/${code}`,{chapterName,schoolName,charterOrganization});};
return <Card><CardHeader><CardTitle>Chapter Settings</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Chapter name" value={chapterName} onChange={(e)=>setChapterName(e.target.value)} /><Input placeholder="School name" value={schoolName} onChange={(e)=>setSchoolName(e.target.value)} /><Input placeholder="Charter organization" value={charterOrganization} onChange={(e)=>setCharterOrganization(e.target.value)} /><Button onClick={save}>Save Changes</Button></CardContent></Card>}
