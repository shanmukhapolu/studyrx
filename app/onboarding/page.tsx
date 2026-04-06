"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  EXPERIENCE_LEVEL_OPTIONS,
  GOAL_OPTIONS,
  GRADE_OPTIONS,
  HOSA_CHARTER_ORGANIZATIONS,
  HOSA_EVENT_OPTIONS,
  MISSED_QUESTION_HANDLING_OPTIONS,
  QUESTION_SESSION_OPTIONS,
  REFERRAL_OPTIONS,
  type OnboardingData,
} from "@/lib/onboarding";

type FormState = Omit<OnboardingData, "onboardingCompleted">;

const TOTAL_STEPS = 8;

const INITIAL_STATE: FormState = {
  grade: "",
  referralSource: "",
  hosaEvents: [],
  hosaEventsOther: "",
  experienceLevel: "",
  goal: "",
  charterOrganization: "",
  questionsPerSession: "",
  missedQuestionHandling: "",
};

export default function OnboardingPage() {
  const { user, loading, onboardingCompleted, completeOnboarding } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const progress = (step / TOTAL_STEPS) * 100;

  const filteredStates = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return HOSA_CHARTER_ORGANIZATIONS;
    return HOSA_CHARTER_ORGANIZATIONS.filter((state) => state.toLowerCase().includes(normalized));
  }, [search]);

  const canContinue =
    (step === 1 && !!form.grade) ||
    (step === 2 && !!form.referralSource) ||
    (step === 3 && form.hosaEvents.length > 0) ||
    (step === 4 && !!form.experienceLevel) ||
    (step === 5 && !!form.goal) ||
    (step === 6 && !!form.charterOrganization) ||
    (step === 7 && !!form.questionsPerSession) ||
    (step === 8 && !!form.missedQuestionHandling);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/signin?next=%2Fonboarding");
    }
    if (!loading && user && onboardingCompleted) {
      router.replace("/dashboard");
    }
  }, [loading, onboardingCompleted, router, user]);

  if (loading || !user || onboardingCompleted) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading onboarding...</div>;
  }

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      hosaEvents: prev.hosaEvents.includes(event) ? prev.hosaEvents.filter((item) => item !== event) : [...prev.hosaEvents, event],
    }));
  };

  const handleNext = async () => {
    if (!canContinue) return;

    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
      return;
    }

    setSaving(true);
    try {
      await completeOnboarding(form);
      router.replace("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Welcome to StudyRx</span>
            <span>{step}/{TOTAL_STEPS} completed</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Card className="min-h-[70vh]">
          <CardHeader>
            <CardTitle>{titleByStep(step)}</CardTitle>
            {descriptionByStep(step) && <CardDescription>{descriptionByStep(step)}</CardDescription>}
          </CardHeader>
          <CardContent className="flex min-h-[50vh] flex-col justify-between">
            <div className="animate-in fade-in-0 slide-in-from-right-2 duration-300 space-y-3">
              {step === 1 && <SingleSelect options={GRADE_OPTIONS} value={form.grade} onSelect={(value) => setForm((prev) => ({ ...prev, grade: value }))} />}

              {step === 2 && <SingleSelect options={REFERRAL_OPTIONS} value={form.referralSource} onSelect={(value) => setForm((prev) => ({ ...prev, referralSource: value }))} />}

              {step === 3 && (
                <div className="space-y-3">
                  {HOSA_EVENT_OPTIONS.map((event) => {
                    const selected = form.hosaEvents.includes(event);
                    return (
                      <label key={event} className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm">
                        <input type="checkbox" checked={selected} onChange={() => toggleEvent(event)} />
                        <span>{event}</span>
                      </label>
                    );
                  })}
                  {form.hosaEvents.includes("Other") && (
                    <Input
                      placeholder="Optional: tell us your event"
                      value={form.hosaEventsOther}
                      onChange={(e) => setForm((prev) => ({ ...prev, hosaEventsOther: e.target.value }))}
                    />
                  )}
                </div>
              )}

              {step === 4 && (
                <SingleSelect
                  options={EXPERIENCE_LEVEL_OPTIONS}
                  value={form.experienceLevel}
                  onSelect={(value) => setForm((prev) => ({ ...prev, experienceLevel: value }))}
                />
              )}

              {step === 5 && <SingleSelect options={GOAL_OPTIONS} value={form.goal} onSelect={(value) => setForm((prev) => ({ ...prev, goal: value }))} />}

              {step === 6 && (
                <div className="space-y-3">
                  <Input placeholder="Search charter organization" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <div className="max-h-72 overflow-y-auto rounded-lg border">
                    {filteredStates.map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, charterOrganization: state }))}
                        className={`block w-full border-b px-4 py-3 text-left text-sm last:border-b-0 ${
                          form.charterOrganization === state ? "bg-primary/10 font-medium" : "hover:bg-muted"
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 7 && (
                <SingleSelect
                  options={QUESTION_SESSION_OPTIONS}
                  value={form.questionsPerSession}
                  onSelect={(value) => setForm((prev) => ({ ...prev, questionsPerSession: value }))}
                />
              )}

              {step === 8 && (
                <SingleSelect
                  options={MISSED_QUESTION_HANDLING_OPTIONS}
                  value={form.missedQuestionHandling}
                  onSelect={(value) => setForm((prev) => ({ ...prev, missedQuestionHandling: value }))}
                  optionDescriptions={{
                    "Focused Redemption Round":
                      "At the end of each session, you'll do a dedicated retry round for the questions you missed.",
                    "Spaced Reinforcement":
                      "Missed questions are mixed into future sessions at random intervals for long-term retention.",
                  }}
                />
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => setStep((prev) => Math.max(1, prev - 1))} disabled={step === 1 || saving}>
                Back
              </Button>
              <Button type="button" onClick={handleNext} disabled={!canContinue || saving}>
                {step === TOTAL_STEPS ? (saving ? "Saving..." : "Finish") : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function titleByStep(step: number) {
  switch (step) {
    case 1:
      return "What grade are you in?";
    case 2:
      return "How did you hear about StudyRx?";
    case 3:
      return "Which HOSA event(s) are you interested in?";
    case 4:
      return "What is your experience level?";
    case 5:
      return "What is your goal?";
    case 6:
      return "Which HOSA charter organization are you in?";
    case 7:
      return "How many questions per session do you prefer?";
    case 8:
      return "How should we handle questions you miss?";
    default:
      return "Welcome";
  }
}

function descriptionByStep(step: number) {
  if (step === 7 || step === 8) {
    return "You can change this anytime in settings.";
  }
  return "";
}

function SingleSelect({
  options,
  value,
  onSelect,
  optionDescriptions,
}: {
  options: readonly string[];
  value: string;
  onSelect: (value: string) => void;
  optionDescriptions?: Record<string, string>;
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`block w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
            value === option ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"
          }`}
        >
          <span className="block">{option}</span>
          {optionDescriptions?.[option] && <span className="mt-1 block text-xs text-muted-foreground">{optionDescriptions[option]}</span>}
        </button>
      ))}
    </div>
  );
}
