"use client";

import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SessionLogList } from "@/components/session-log-list";
import { storage, type SessionData } from "@/lib/storage";
import { getEventName } from "@/lib/events";

export default function SessionsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SessionsContent />
      </SidebarInset>
    </SidebarProvider>
  );
}

function SessionsContent() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [practicedEvents, setPracticedEvents] = useState<string[]>([]);

  useEffect(() => {
    const allSessions = storage.getAllSessions();
    setSessions(allSessions);
    setPracticedEvents(storage.getPracticedEvents());
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Session Logs</h1>
            <p className="text-muted-foreground mt-1 font-light">
              Review past practice sessions and open detailed analytics
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>All Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="all">All Events</TabsTrigger>
                {practicedEvents.map((eventId) => (
                  <TabsTrigger key={eventId} value={eventId}>
                    {getEventName(eventId)}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all">
                <SessionLogList sessions={sessions} />
              </TabsContent>

              {practicedEvents.map((eventId) => (
                <TabsContent key={eventId} value={eventId}>
                  <SessionLogList sessions={sessions} eventId={eventId} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
