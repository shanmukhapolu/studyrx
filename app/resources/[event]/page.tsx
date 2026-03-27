"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEventById, getEventName } from "@/lib/events";

type EventResource = {
  id: string;
  eventId: string;
  title: string;
  description: string;
  link: string;
};

export default function EventResourcesPage({ params }: { params: Promise<{ event: string }> }) {
  const resolvedParams = use(params);

  return (
    <SidebarProvider>
      <AuthGuard>
        <AppSidebar />
        <SidebarInset>
          <ResourcesContent eventId={resolvedParams.event} />
        </SidebarInset>
      </AuthGuard>
    </SidebarProvider>
  );
}

function ResourcesContent({ eventId }: { eventId: string }) {
  const [resources, setResources] = useState<EventResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const event = getEventById(eventId);
  const eventName = getEventName(eventId);

  useEffect(() => {
    const loadResources = async () => {
      try {
        const response = await fetch("/resources/resources.json");
        if (!response.ok) throw new Error("Failed to load resources.");
        const data = (await response.json()) as EventResource[];
        setResources(data);
      } catch (error) {
        console.error(error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void loadResources();
  }, []);

  const eventResources = useMemo(
    () => resources.filter((resource) => resource.eventId === eventId),
    [resources, eventId]
  );

  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-6xl">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{eventName} Resources</h1>
          <p className="text-muted-foreground">Curated materials to help you prepare for this event.</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading resources...</p>
        ) : loadError ? (
          <p className="text-destructive">Could not load resources right now.</p>
        ) : eventResources.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No resources added for this event yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {eventResources.map((resource) => (
              <a key={resource.id} href={resource.link} target="_blank" rel="noreferrer" className="block">
                <Card className="h-full border-border/70 hover:border-primary/40 hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
