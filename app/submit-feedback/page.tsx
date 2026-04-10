"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ALL_REQUESTABLE_EVENTS } from "@/lib/event-request-options";
import { rtdbPost } from "@/lib/rtdb";
import { toast } from "sonner";

export default function SubmitFeedbackPage() {
  const { user, profile } = useAuth();
  const [feedbackType, setFeedbackType] = useState("Bug");
  const [message, setMessage] = useState("");
  const [eventName, setEventName] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [testimonialConsent, setTestimonialConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isTestimonial = feedbackType === "Testimonial";

  return (
    <SidebarProvider>
      <AuthGuard>
        <AppSidebar />
        <SidebarInset>
          <div className="mx-auto w-full max-w-7xl p-6">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-3xl">Submit Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Feedback Type</label>
                  <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)}>
                    <option>Bug</option>
                    <option>Suggestion</option>
                    <option>Content Issue</option>
                    <option>Question</option>
                    <option>Testimonial</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Message</label>
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={6}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Tell us what happened or what you want improved."
                  />
                </div>

                {isTestimonial ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Name (optional)</label>
                      <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should we credit you?" />
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={testimonialConsent}
                        onChange={(event) => setTestimonialConsent(event.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <span>
                        I give full permission for StudyRx to use this testimonial, feature it on the website, and make it public.
                      </span>
                    </label>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Event (optional)</label>
                      <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={eventName} onChange={(event) => setEventName(event.target.value)}>
                        <option value="">No specific event</option>
                        {ALL_REQUESTABLE_EVENTS.map((eventOption) => (
                          <option key={eventOption} value={eventOption}>{eventOption}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Email (optional)</label>
                      <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                    </div>
                  </>
                )}

                <Button
                  disabled={submitting || !message.trim() || (isTestimonial && !testimonialConsent)}
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      await rtdbPost("feedback_submissions", {
                        feedbackType,
                        message,
                        eventName: isTestimonial ? null : eventName || null,
                        email: isTestimonial ? null : email || null,
                        displayName: isTestimonial ? displayName.trim() || null : null,
                        testimonialConsent: isTestimonial ? testimonialConsent : false,
                        submittedBy: {
                          uid: user?.uid || "",
                          name: [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || user?.displayName || "",
                          email: user?.email || "",
                        },
                        createdAt: new Date().toISOString(),
                      });
                      toast.success("Feedback submitted.");
                      setMessage("");
                      setEventName("");
                      setEmail("");
                      setDisplayName("");
                      setTestimonialConsent(false);
                      setFeedbackType("Bug");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to submit feedback.");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </AuthGuard>
    </SidebarProvider>
  );
}
