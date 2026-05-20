import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChapterAnalyticsPage(){return <div className="space-y-4"><h1 className="text-2xl font-bold">Analytics</h1><Card><CardHeader><CardTitle>Performance Trends</CardTitle></CardHeader><CardContent>Trend charts for score and accuracy over time.</CardContent></Card><Card><CardHeader><CardTitle>Top Performers & Weak Topics</CardTitle></CardHeader><CardContent>Leaderboard trends and most-missed topics across the chapter.</CardContent></Card></div>}
