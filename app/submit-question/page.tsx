"use client";

import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ContributorGuard } from "@/components/auth/contributor-guard";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { HOSA_EVENTS_DISPLAY_ORDER as HOSA_EVENTS } from "@/lib/events";
import { rtdbGet, rtdbPost, rtdbSet } from "@/lib/rtdb";
import { toast } from "sonner";

type Difficulty = "easy" | "medium" | "hard";

export default function SubmitQuestionPage() {
  const { user, profile } = useAuth();
  const [event, setEvent] = useState(HOSA_EVENTS[0]?.id || "");
  const [tag, setTag] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<Array<{
    id: string;
    event?: string;
    tag?: string;
    difficulty?: string;
    question?: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
    status?: string;
    adminNotes?: string;
  }>>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; message?: string; status?: string; createdAt?: string }>>([]);

  const isValid = useMemo(() => {
    const filledOptions = options.filter((option) => option.trim().length > 0);
    return (
      event &&
      tag.trim() &&
      question.trim() &&
      explanation.trim() &&
      filledOptions.length === 4 &&
      correctAnswer.trim() &&
      filledOptions.includes(correctAnswer)
    );
  }, [correctAnswer, event, explanation, options, question, tag]);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      const [submissionsData, notificationsData] = await Promise.all([
        rtdbGet<Record<string, { event?: string; tag?: string; difficulty?: string; question?: string; options?: string[]; correctAnswer?: string; explanation?: string; status?: string; adminNotes?: string }>>(`users/${user.uid}/question_submissions`, {}),
        rtdbGet<Record<string, { message?: string; status?: string; createdAt?: string }>>(`users/${user.uid}/notifications`, {}),
      ]);

      const mine = Object.entries(submissionsData)
        .map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => b.id.localeCompare(a.id));
      setMySubmissions(mine);

      const notes = Object.entries(notificationsData)
        .map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setNotifications(notes);
    };
    void load();
  }, [user?.uid, submitting]);

  return (
    <SidebarProvider>
      <AuthGuard>
        <ContributorGuard>
          <AppSidebar />
          <SidebarInset>
            <div className="mx-auto max-w-7xl p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="border-primary/20 shadow-none bg-card/70 backdrop-blur-md lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-3xl">Submit a Question</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Share a high-quality practice question for review by admins. Approved questions can be exported into the static question bank.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">Event</label>
                      <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={event} onChange={(e) => setEvent(e.target.value)}>
                        {HOSA_EVENTS.map((hosaEvent) => (
                          <option key={hosaEvent.id} value={hosaEvent.id}>{hosaEvent.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Difficulty</label>
                      <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                        <option value="easy">easy</option>
                        <option value="medium">medium</option>
                        <option value="hard">hard</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Topic / Tag</label>
                    <Input placeholder="e.g. Terminology, Anatomy, Abbreviations" value={tag} onChange={(e) => setTag(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Question</label>
                    <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={4} placeholder="Question text" value={question} onChange={(e) => setQuestion(e.target.value)} />
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="mb-3 text-sm font-semibold">Answer choices (exactly 4)</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {options.map((choice, index) => (
                        <Input
                          key={index}
                          placeholder={`Choice ${index + 1}`}
                          value={choice}
                          onChange={(e) => {
                            const next = [...options];
                            next[index] = e.target.value;
                            setOptions(next);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Correct answer</label>
                    <Input placeholder="Must exactly match one of the 4 choices" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Explanation</label>
                    <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={4} placeholder="Why is this answer correct?" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                  </div>
                  <Button
                    disabled={!isValid || submitting}
                    className="h-11"
                    onClick={async () => {
                      try {
                        setSubmitting(true);
                        const created = await rtdbPost("question_submissions", {
                          event,
                          tag,
                          difficulty,
                          question,
                          options,
                          correctAnswer,
                          explanation,
                          status: "pending",
                          adminNotes: "",
                          submittedBy: {
                            uid: user?.uid || "",
                            name: [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || user?.displayName || "",
                            email: user?.email || "",
                          },
                          createdAt: new Date().toISOString(),
                        });
                        if (user?.uid) {
                          await rtdbSet(`users/${user.uid}/question_submissions/${created.name}`, {
                            event,
                            tag,
                            difficulty,
                            question,
                            options,
                            correctAnswer,
                            explanation,
                            status: "pending",
                            adminNotes: "",
                            createdAt: new Date().toISOString(),
                          });
                        }
                        toast.success("Question submitted for review.");
                        setTag("");
                        setQuestion("");
                        setOptions(["", "", "", ""]);
                        setCorrectAnswer("");
                        setExplanation("");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to submit question.");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {submitting ? "Submitting..." : "Submit Question"}
                  </Button>
                </CardContent>
                </Card>

                <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Your Submissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {mySubmissions.length === 0 && <p className="text-muted-foreground">No submissions yet.</p>}
                    {mySubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className={`w-full rounded-md border p-3 text-left ${submission.status === "approved" ? "bg-green-50/60" : submission.status === "rejected" ? "bg-red-50/60" : "bg-card"}`}
                      >
                        <button
                          className="w-full text-left"
                          onClick={() => {
                            if (submission.status !== "rejected") return;
                            setEvent(submission.event || HOSA_EVENTS[0]?.id || "");
                            setTag(submission.tag || "");
                            setDifficulty((submission.difficulty as Difficulty) || "medium");
                            setQuestion(submission.question || "");
                            setOptions(
                              Array.isArray(submission.options) && submission.options.length === 4
                                ? submission.options
                                : ["", "", "", ""]
                            );
                            setCorrectAnswer(submission.correctAnswer || "");
                            setExplanation(submission.explanation || "");
                            toast.info("Rejected submission loaded into the form for resubmission.");
                          }}
                        >
                          <p className="font-medium">{submission.event || "Unknown event"} · {submission.tag || "No topic"}</p>
                          <p className="text-xs capitalize text-muted-foreground">Status: {submission.status || "pending"}</p>
                          {submission.adminNotes && <p className="text-xs text-muted-foreground">Admin notes: {submission.adminNotes}</p>}
                        </button>
                        {(submission.status === "approved" || submission.status === "rejected") && (
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await rtdbSet(`users/${user?.uid}/question_submissions/${submission.id}`, null);
                                setMySubmissions((prev) => prev.filter((item) => item.id !== submission.id));
                                toast.success("Submission removed from your list.");
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {notifications.length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}
                    {notifications.map((notification) => (
                      <div key={notification.id} className="rounded-md border p-3">
                        <p>{notification.message || "Update received."}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground capitalize">{notification.status || "info"}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await rtdbSet(`users/${user?.uid}/notifications/${notification.id}`, null);
                              setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                </div>
              </div>
            </div>
          </SidebarInset>
        </ContributorGuard>
      </AuthGuard>
    </SidebarProvider>
  );
}
