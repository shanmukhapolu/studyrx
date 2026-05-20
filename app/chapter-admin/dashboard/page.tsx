import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChapterAdminDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chapter Dashboard</h1>
      <Card><CardHeader><CardTitle>Chapter Header</CardTitle></CardHeader><CardContent>Chapter Name • School • Chapter Code (copy)</CardContent></Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total Members</CardTitle></CardHeader><CardContent>0</CardContent></Card>
        <Card><CardHeader><CardTitle>Active Tests</CardTitle></CardHeader><CardContent>0</CardContent></Card>
        <Card><CardHeader><CardTitle>Recent Completion Rate</CardTitle></CardHeader><CardContent>0%</CardContent></Card>
      </div>
      <div className="flex gap-2"><Button asChild><Link href="/chapter-admin/tests/create">Create Test</Link></Button><Button asChild variant="outline"><Link href="/chapter-admin/members">Invite Members</Link></Button></div>
    </div>
  );
}
