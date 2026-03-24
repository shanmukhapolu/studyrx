"use client";

import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { HOSA_EVENTS } from "@/lib/events";
import { rtdbPost } from "@/lib/rtdb";
import { toast } from "sonner";

type Difficulty = "easy" | "medium" | "hard";

export default function SubmitQuestionPage() {
  const [event, setEvent] = useState(HOSA_EVENTS[0]?.id || "");
  const [tag, setTag] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <SidebarProvider>
      <AuthGuard>
        <AppSidebar />
        <SidebarInset>
          <div className="mx-auto max-w-3xl p-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit a Question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={event} onChange={(e) => setEvent(e.target.value)}>
                  {HOSA_EVENTS.map((hosaEvent) => (
                    <option key={hosaEvent.id} value={hosaEvent.id}>{hosaEvent.name}</option>
                  ))}
                </select>
                <Input placeholder="Topic / Tag" value={tag} onChange={(e) => setTag(e.target.value)} />
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder="Question text" value={question} onChange={(e) => setQuestion(e.target.value)} />
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
                <Input placeholder="Correct answer (must exactly match one choice)" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} placeholder="Explanation" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                <Button
                  disabled={!isValid || submitting}
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      await rtdbPost("question_submissions", {
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
          </div>
        </SidebarInset>
      </AuthGuard>
    </SidebarProvider>
  );
}
