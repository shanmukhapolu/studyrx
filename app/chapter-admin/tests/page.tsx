import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChapterTestsPage(){return <div className="space-y-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Tests</h1><Button asChild><Link href="/chapter-admin/tests/create">Create Test</Link></Button></div><Card><CardHeader><CardTitle>Active Tests</CardTitle></CardHeader><CardContent>No active tests yet.</CardContent></Card><Card><CardHeader><CardTitle>Past Tests</CardTitle></CardHeader><CardContent>Completed tests appear here. Open report at <code>/chapter-admin/tests/:id/report</code>.</CardContent></Card></div>}
