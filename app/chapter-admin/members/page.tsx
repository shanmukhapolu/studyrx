"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet } from "@/lib/rtdb";
import type { ChapterRecord } from "@/lib/chapter";

export default function ChapterMembersPage(){const {user}=useAuth(); const [code,setCode]=useState(""); const [members,setMembers]=useState<Array<{uid:string;name:string;email:string}>>([]);
useEffect(()=>{const load=async()=>{if(!user?.uid)return;const me=await rtdbGet<{chapterCode?:string}>(`users/${user.uid}`,{}); if(!me.chapterCode) return; setCode(me.chapterCode); const ch=await rtdbGet<ChapterRecord|null>(`chapters/${me.chapterCode}`,null); const ids=Object.keys(ch?.members||{}).filter((id)=>ch?.members?.[id]); const rows=await Promise.all(ids.map(async(uid)=>{const u=await rtdbGet<{name?:string;email?:string}>(`users/${uid}`,{});return {uid,name:u.name||"Unnamed",email:u.email||"-"};})); setMembers(rows)}; void load(); const i=window.setInterval(()=>void load(),5000); return ()=>window.clearInterval(i)},[user?.uid]);
return <div className="grid gap-4 lg:grid-cols-[7fr_3fr]"><Card><CardHeader><CardTitle>Members</CardTitle></CardHeader><CardContent>{members.length===0?<p className="text-muted-foreground">No users.</p>:<table className="w-full text-sm"><thead><tr className="text-left"><th className="pb-2">Name</th><th>Email</th></tr></thead><tbody>{members.map(m=><tr key={m.uid} className="border-t"><td className="py-2">{m.name}</td><td>{m.email}</td></tr>)}</tbody></table>}</CardContent></Card><Card className="h-fit"><CardHeader><CardTitle>Invite New Members</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Share this chapter code with members so they can join from their dashboard.</p><div className="flex items-center gap-2"><code className="rounded bg-muted px-2 py-1">{code||"-"}</code><Button size="icon" variant="ghost" onClick={()=>code&&navigator.clipboard.writeText(code)}><Copy className="h-4 w-4" /></Button></div></CardContent></Card></div>}
