import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChapterPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Chapter</h1>
      <Card>
        <CardHeader><CardTitle>Active Assigned Tests</CardTitle></CardHeader>
        <CardContent>No active chapter tests yet.</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Past Tests & Results</CardTitle></CardHeader>
        <CardContent>Your completed chapter assessments and results will appear here.</CardContent>
      </Card>
    </div>
  );
}
