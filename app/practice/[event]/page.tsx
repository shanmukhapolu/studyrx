"use client";

import { useState, useEffect, useMemo, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DEFAULT_USER_SETTINGS, storage, type Question, type SessionData, type UserSettings } from "@/lib/storage";
import { todayDateString, updateProgress } from "@/lib/spaced-repetition";
import { formatDuration } from "@/lib/session-analytics";
import { getEventById, getEventName } from "@/lib/events";
import { 
  Brain,
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Sparkles, 
  Play, 
  ArrowLeft,
  BadgeCheck,
  Dna,
  Stethoscope,
  ShieldAlert 
} from "lucide-react";
import Confetti from "react-confetti";
import { rtdbPost } from "@/lib/rtdb";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";

// Utility to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Queue item tracks question id and whether it's a redemption attempt
interface QueueItem {
  questionId: number;
  isRedemption: boolean;
}

function toQueueItems(questionIds: number[], isRedemption: boolean) {
  return questionIds.map((questionId) => ({ questionId, isRedemption }));
}

function buildPracticeQueue({ questions, progress, today, limit }: { questions: Question[]; progress: Record<string, import("@/lib/spaced-repetition").UserQuestionProgress>; today: string; limit: number; }) {
  const due = questions.filter((q) => {
    const p = progress[String(q.id)];
    return Boolean(p && p.repetitionCount > 0 && p.nextDueDate <= today);
  });
  const fresh = questions.filter((q) => {
    const p = progress[String(q.id)];
    return !p || p.repetitionCount === 0;
  });

  const dueIds = shuffleArray(due.map((q) => q.id));
  const freshIds = shuffleArray(fresh.map((q) => q.id));
  const queueIds = [...dueIds, ...freshIds].slice(0, limit);
  return toQueueItems(queueIds, false);
}

export default function PracticePage({ params }: { params: Promise<{ event: string }> }) {
  const resolvedParams = use(params);
  
  return (
    <SidebarProvider>
      <AuthGuard>
        <AppSidebar />
        <SidebarInset>
          <PracticeContent eventId={resolvedParams.event} />
        </SidebarInset>
      </AuthGuard>
    </SidebarProvider>
  );
}

function PracticeContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionQueue, setQuestionQueue] = useState<QueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [liveThinkDisplay, setLiveThinkDisplay] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<{
    totalQuestions: number;
    correct: number;
    incorrect: number;
    highestStreak: number;
    sessionTime: number;
  } | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [sessionSaveError, setSessionSaveError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [questionProgress, setQuestionProgress] = useState<Record<string, import("@/lib/spaced-repetition").UserQuestionProgress>>({});
  const [baseQueueLength, setBaseQueueLength] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Incorrect answer");
  const [reportOtherReason, setReportOtherReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [hasPersistedSession, setHasPersistedSession] = useState(false);
  const [remainingDueCount, setRemainingDueCount] = useState(0);
  const hasActiveSession = hasStarted && !isComplete;

  const questionShownAtRef = useRef<number>(performance.now());
  const thinkHiddenStartRef = useRef<number | null>(null);
  const thinkPausedMsRef = useRef(0);
  const explanationStartedAtRef = useRef<number | null>(null);
  const explanationHiddenStartRef = useRef<number | null>(null);
  const explanationPausedMsRef = useRef(0);

  useEffect(() => {
    if (!hasStarted) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (!isAnswered && thinkHiddenStartRef.current === null) {
          thinkHiddenStartRef.current = performance.now();
        }
        if (isAnswered && explanationStartedAtRef.current && explanationHiddenStartRef.current === null) {
          explanationHiddenStartRef.current = performance.now();
        }
      } else {
        if (!isAnswered && thinkHiddenStartRef.current !== null) {
          thinkPausedMsRef.current += performance.now() - thinkHiddenStartRef.current;
          thinkHiddenStartRef.current = null;
        }
        if (isAnswered && explanationHiddenStartRef.current !== null) {
          explanationPausedMsRef.current += performance.now() - explanationHiddenStartRef.current;
          explanationHiddenStartRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hasStarted, isAnswered]);

  useEffect(() => {
    if (!hasActiveSession) return;

    const warningMessage = "Are you sure you want to leave practice? Your progress might be lost.";

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = warningMessage;
      return warningMessage;
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (anchor.target === "_blank") return;

      const shouldLeave = window.confirm(warningMessage);
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasActiveSession]);

  useEffect(() => {
    if (!hasStarted || isAnswered) {
      setLiveThinkDisplay(0);
      return;
    }

    const tick = () => {
      const hiddenOffset =
        thinkPausedMsRef.current +
        (thinkHiddenStartRef.current ? performance.now() - thinkHiddenStartRef.current : 0);
      const elapsed = Math.max(0, (performance.now() - questionShownAtRef.current - hiddenOffset) / 1000);
      setLiveThinkDisplay(Math.round(elapsed * 10) / 10);
    };

    tick();
    const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [hasStarted, isAnswered, currentQueueIndex]);

  const event = getEventById(eventId);
  const eventName = getEventName(eventId);
  const eventIsPublished = Boolean(event?.published);

  useEffect(() => {
    if (!eventIsPublished) return;
    loadQuestions();
  }, [eventId, eventIsPublished]);

  const loadQuestions = async () => {
    if (!event || !eventIsPublished) {
      setLoadError(true);
      return;
    }

    try {
      const res = await fetch(event.questionBankFile);
      if (!res.ok) throw new Error("Failed to load questions");
      
      const questions: Question[] = await res.json();
      setAllQuestions(questions);

      const [loadedProgress, loadedSettings] = await Promise.all([
        storage.getQuestionProgress(eventId),
        storage.getSettings(),
      ]);

      setSettings(loadedSettings);

      setQuestionProgress(loadedProgress);
      const queue = buildPracticeQueue({ questions, progress: loadedProgress, today: todayDateString(), limit: loadedSettings.sessionQuestionLimit });
      const dueTotal = questions.filter((q) => { const p = loadedProgress[String(q.id)]; return Boolean(p && p.repetitionCount > 0 && p.nextDueDate <= todayDateString()); }).length;
      setRemainingDueCount(Math.max(0, dueTotal - queue.length));
      if (queue.length === 0) {
        setIsComplete(true);
        setShowConfetti(true);
      } else {
        setQuestionQueue(queue);
        setBaseQueueLength(queue.length);
      }
    } catch (error) {
      console.error("Failed to load questions:", error);
      setLoadError(true);
    }
  };

  const currentQueueItem = questionQueue[currentQueueIndex];
  const currentQuestion = useMemo(() => {
    if (!currentQueueItem) return null;
    return allQuestions.find(q => q.id === currentQueueItem.questionId) || null;
  }, [currentQueueItem, allQuestions]);

  useEffect(() => {
    if (currentQuestion) {
      setShuffledOptions(shuffleArray(currentQuestion.options));
    }
  }, [currentQueueItem]);

  const startPractice = () => {
    const newSession: SessionData = storage.createSession(eventId, "practice");
    setSessionData(newSession);
    setSessionSummary(null);
    setHasPersistedSession(false);
    setCurrentQueueIndex(0);
    questionShownAtRef.current = performance.now();
    thinkHiddenStartRef.current = null;
    thinkPausedMsRef.current = 0;
    explanationStartedAtRef.current = null;
    explanationHiddenStartRef.current = null;
    explanationPausedMsRef.current = 0;
    setHasStarted(true);
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !sessionData || !currentQuestion || !currentQueueItem) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (thinkHiddenStartRef.current !== null) {
      thinkPausedMsRef.current += performance.now() - thinkHiddenStartRef.current;
      thinkHiddenStartRef.current = null;
    }
    const submitTime = performance.now();
    const thinkTime = Math.max(
      0,
      Math.round(((submitTime - questionShownAtRef.current - thinkPausedMsRef.current) / 1000) * 10) / 10
    );
    const nowIso = new Date().toISOString();
    const timestampStart = new Date(Date.now() - (submitTime - questionShownAtRef.current)).toISOString();
    const timestampSubmit = nowIso;

    const attempt = {
      questionId: currentQuestion.id,
      questionIndex: sessionData.attempts.length + 1,
      category: currentQuestion.category,
      tag: currentQuestion.tag,
      difficulty: currentQuestion.difficulty,
      isCorrect,
      thinkTime,
      explanationTime: 0,
      timestampStart,
      timestampSubmit,
      isRedemption: currentQueueItem.isRedemption,
      eventId,
    };

    const updatedSession = {
      ...sessionData,
      attempts: [...sessionData.attempts, attempt],
    };
    setSessionData(updatedSession);
    void storage.setCurrentSession(updatedSession);
    explanationStartedAtRef.current = performance.now();
    explanationHiddenStartRef.current = null;
    explanationPausedMsRef.current = 0;

    setTotalAnswered(prev => prev + 1);
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);

    } else {
      setIncorrectCount(prev => prev + 1);

    }

    const nextProgress = { ...questionProgress, [String(currentQuestion.id)]: updateProgress(currentQuestion.id, questionProgress[String(currentQuestion.id)], isCorrect, thinkTime) };
    setQuestionProgress(nextProgress);
    void storage.saveQuestionProgress(eventId, nextProgress);
    setIsAnswered(true);
  };

  const handleNextQuestion = () => {
    if (!sessionData || !currentQuestion) return;

    if (explanationStartedAtRef.current !== null) {
      if (explanationHiddenStartRef.current !== null) {
        explanationPausedMsRef.current += performance.now() - explanationHiddenStartRef.current;
        explanationHiddenStartRef.current = null;
      }

      const explanationTime = Math.max(
        0,
        Math.round(((performance.now() - explanationStartedAtRef.current - explanationPausedMsRef.current) / 1000) * 10) / 10
      );

      const attemptsWithExplanation = sessionData.attempts.map((attempt, index, arr) => {
        if (index !== arr.length - 1) return attempt;
        return {
          ...attempt,
          explanationTime,
        };
      });

      const primaryAttempts = attemptsWithExplanation.filter((attempt) => !attempt.isRedemption);
      const totalQuestions = primaryAttempts.length;
      const sessionCorrectCount = primaryAttempts.filter((a) => a.isCorrect).length;
      const updatedSession = {
        ...sessionData,
        attempts: attemptsWithExplanation,
        totalQuestions,
        correctCount: sessionCorrectCount,
        totalThinkTime: attemptsWithExplanation.reduce((sum, a) => sum + a.thinkTime, 0),
        totalExplanationTime: attemptsWithExplanation.reduce((sum, a) => sum + a.explanationTime, 0),
        accuracy: totalQuestions > 0 ? (sessionCorrectCount / totalQuestions) * 100 : 0,
      };

      setSessionData(updatedSession);
      void storage.setCurrentSession(updatedSession);
    }

    explanationStartedAtRef.current = null;
    explanationHiddenStartRef.current = null;
    explanationPausedMsRef.current = 0;

    const nextIndex = currentQueueIndex + 1;
    
    if (nextIndex >= questionQueue.length) {
      setIsComplete(true);
      setShowConfetti(true);
      return;
    }

    setCurrentQueueIndex(nextIndex);
    setSelectedAnswer(null);
    setIsAnswered(false);
    questionShownAtRef.current = performance.now();
    thinkHiddenStartRef.current = null;
    thinkPausedMsRef.current = 0;
  };

  const handleEndSession = () => {
    setIsComplete(true);
    setShowConfetti(true);
  };

  const persistSession = async () => {
    if (!sessionData) {
      return;
    }

    setIsEndingSession(true);
    setSessionSaveError(null);

    const attemptsWithFinalExplanation = [...sessionData.attempts];

    if (isAnswered && explanationStartedAtRef.current !== null && attemptsWithFinalExplanation.length > 0) {
      if (explanationHiddenStartRef.current !== null) {
        explanationPausedMsRef.current += performance.now() - explanationHiddenStartRef.current;
        explanationHiddenStartRef.current = null;
      }

      const explanationTime = Math.max(
        0,
        Math.round(((performance.now() - explanationStartedAtRef.current - explanationPausedMsRef.current) / 1000) * 10) / 10
      );

      const lastAttemptIndex = attemptsWithFinalExplanation.length - 1;
      attemptsWithFinalExplanation[lastAttemptIndex] = {
        ...attemptsWithFinalExplanation[lastAttemptIndex],
        explanationTime,
      };
    }

    const primaryAttempts = attemptsWithFinalExplanation.filter((attempt) => !attempt.isRedemption);
    const totalQuestions = primaryAttempts.length;
    const correct = primaryAttempts.filter((attempt) => attempt.isCorrect).length;
    const totalThinkTime = attemptsWithFinalExplanation.reduce((sum, attempt) => sum + attempt.thinkTime, 0);
    const totalExplanationTime = attemptsWithFinalExplanation.reduce((sum, attempt) => sum + attempt.explanationTime, 0);
    const highestStreak = primaryAttempts.reduce(
      (acc, attempt) => {
        if (attempt.isCorrect) {
          const current = acc.current + 1;
          return {
            current,
            max: Math.max(acc.max, current),
          };
        }
        return {
          current: 0,
          max: acc.max,
        };
      },
      { current: 0, max: 0 }
    ).max;

    const finishedSession: SessionData = {
      ...sessionData,
      attempts: attemptsWithFinalExplanation,
      totalQuestions,
      correctCount: correct,
      totalThinkTime,
      totalExplanationTime,
      accuracy: totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0,
      endTimestamp: new Date().toISOString(),
    };

    try {
      await storage.saveSession(finishedSession);
      await storage.setCurrentSession(null);
      setSessionData(finishedSession);
      setSessionSummary({
        totalQuestions,
        correct,
        incorrect: totalQuestions - correct,
        highestStreak,
        sessionTime: totalThinkTime + totalExplanationTime,
      });
      setHasPersistedSession(true);
    } catch (error) {
      console.error("Failed to save session", error);
      setSessionSaveError("Couldn't save your session. Please try ending again.");
    } finally {
      setIsEndingSession(false);
    }
  };

  useEffect(() => {
    if (!isComplete || hasPersistedSession || !sessionData) return;
    void persistSession();
  }, [isComplete, hasPersistedSession, sessionData]);

  const handleRestart = () => {
    window.location.reload();
  };

  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The event you're looking for doesn't exist or couldn't be loaded.
            </p>
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

  if (!eventIsPublished) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {eventName} is not published yet. Check back soon.
            </p>
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

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The event you're looking for doesn't exist or couldn't be loaded.
            </p>
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

  if (!hasStarted && !isComplete) {
    const Icon = event.icon;
    
    return (
      <div className="flex-1 overflow-auto p-8">
        <div className="container mx-auto max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-4"
          >
            <Link href="/events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Link>
          </Button>
          
          <Card className="border-primary/20 shadow-none bg-card/50 backdrop-blur-md">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/12 flex items-center justify-center">
                <Icon className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-4xl font-bold">{eventName}</CardTitle>
              <p className="text-muted-foreground text-lg font-light">
                {event.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 p-6 bg-muted/30 rounded-xl">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                  Session length: <strong>{`${settings.sessionQuestionLimit} questions`}</strong>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Instant Feedback</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Get immediate results and detailed explanations for every question
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Spaced Repetition System</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Questions are rescheduled automatically using a deterministic spaced repetition algorithm.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Complete Mastery</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Correct and incorrect answers both affect future due dates to prevent memorization gaming.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={startPractice}
                size="lg"
                className="w-full text-lg h-14 font-semibold shadow-none"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Practice Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const summary = sessionSummary ?? {
      totalQuestions: totalAnswered,
      correct: correctCount,
      incorrect: incorrectCount,
      highestStreak: 0,
      sessionTime: 0,
    };
    return (
      <div className="flex-1 overflow-auto p-8 relative">
        {showConfetti && (
          <Confetti
            width={typeof window !== "undefined" ? window.innerWidth : 300}
            height={typeof window !== "undefined" ? window.innerHeight : 200}
            recycle={false}
            numberOfPieces={500}
            gravity={0.3}
            onConfettiComplete={() => setShowConfetti(false)}
          />
        )}
        <div className="container mx-auto max-w-2xl">
          <Card className="border-primary/20 shadow-none bg-card/50 backdrop-blur-md">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-24 h-24 rounded-2xl bg-primary/12 flex items-center justify-center animate-pulse">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-5xl font-bold">Congratulations!</CardTitle>
              <p className="text-muted-foreground text-xl font-light">
                {`You've completed your ${eventName} session!`}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-8 bg-card/75 rounded-xl text-center border border-primary/20">
                <h3 className="text-3xl font-bold mb-3">Session Complete</h3>
                <p className="text-muted-foreground text-lg">
                  {remainingDueCount > 0
                    ? `You still have ${remainingDueCount} questions due today. Start another session.`
                    : "Nice work. Review your results or jump into another session whenever you're ready."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-6 bg-muted/50 rounded-xl border border-border">
                  <div className="text-3xl font-bold text-primary font-mono">{summary.totalQuestions}</div>
                  <div className="text-sm text-muted-foreground mt-2">Answered</div>
                </div>
                <div className="text-center p-6 bg-muted/50 rounded-xl border border-border">
                  <div className="text-3xl font-bold text-accent font-mono">{summary.correct}</div>
                  <div className="text-sm text-muted-foreground mt-2">Correct</div>
                </div>
                <div className="text-center p-6 bg-muted/50 rounded-xl border border-border">
                  <div className="text-3xl font-bold text-destructive font-mono">{summary.incorrect}</div>
                  <div className="text-sm text-muted-foreground mt-2">Incorrect</div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Session time: <strong className="text-foreground">{formatDuration(summary.sessionTime)}</strong>
              </div>

              {isEndingSession && <p className="text-sm text-muted-foreground">Saving your session...</p>}

              <div className="flex gap-4">
                <Button onClick={() => router.push("/events")} size="lg" className="flex-1 h-14 text-base">
                  Back to Events
                </Button>
                <Button onClick={handleRestart} variant="outline" size="lg" className="flex-1 h-14 text-base bg-transparent">
                  Practice Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (questionQueue.length === 0 || !currentQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-border/60 bg-card/70 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="md:hidden" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("End session? Progress will not be saved.")) {
                    router.push("/events");
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="hidden md:block text-sm font-medium text-muted-foreground">
                {eventName}
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Think</span>
                <span className="font-mono text-sm font-bold text-primary">{liveThinkDisplay.toFixed(1)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent" />
                <span className="text-lg font-mono font-bold">{correctCount}</span>
                <span className="text-sm text-muted-foreground hidden sm:inline">correct</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-lg font-mono font-bold">{incorrectCount}</span>
                <span className="text-sm text-muted-foreground hidden sm:inline">incorrect</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-12">
        {sessionSaveError && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {sessionSaveError}
          </div>
        )}
        <Card className="glass-card tech-border shadow-none relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,theme(colors.accent/20),transparent_40%)] pointer-events-none" />
          <div className="absolute right-5 top-5 z-10">
            <Button size="sm" variant="outline" onClick={() => setShowReportModal(true)}>Report Question</Button>
          </div>
          <CardHeader>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-5">
              <div
                className="h-full rounded-full bg-primary/70 transition-all"
                style={{ width: `${((currentQueueIndex + 1) / Math.max(questionQueue.length, 1)) * 100}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono mb-2">
              Question {currentQueueIndex + 1} / {questionQueue.length}
            </div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              
              {currentQuestion.tag && (
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-medium">
                  {(() => {
                    if (currentQuestion.tag.toLowerCase() === "official") {
                      return <BadgeCheck className="h-4 w-4 text-primary" />;
                    }
                    switch (currentQuestion.category) {
                      case "Cell Biology & Genetics":
                        return <Dna className="h-4 w-4 text-primary" />;
                      case "Human Physiology":
                        return <Stethoscope className="h-4 w-4 text-primary" />;
                      case "Human Disease":
                        return <ShieldAlert className="h-4 w-4 text-primary" />;
                      default:
                        return <Sparkles className="h-4 w-4 text-primary" />;
                    }
                  })()}
                  
                  <span className="text-primary uppercase tracking-tight font-semibold">
                    {currentQuestion.tag.toLowerCase() === "official" ? "Official" : currentQuestion.tag}
                  </span>
                </div>
              )}
            </div>
            <CardTitle className="text-2xl leading-relaxed text-balance font-semibold">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {shuffledOptions.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.correctAnswer;
                const showResult = isAnswered;

                let buttonClasses = "w-full justify-start text-left h-auto py-4 px-6 text-base font-medium transition-all bg-background/70 hover:bg-primary/10 hover:-translate-y-0.5";
                
                if (showResult) {
                  if (isCorrect) {
                    buttonClasses += " border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20";
                  } else if (isSelected && !isCorrect) {
                    buttonClasses += " border-destructive bg-destructive/10 text-destructive hover:bg-destructive/10";
                  }
                } else if (isSelected) {
                  buttonClasses += " border-primary bg-primary/10 text-primary";
                }

                return (
                  <Button
                    key={`${currentQueueIndex}-${index}`}
                    variant="outline"
                    onClick={() => handleAnswerSelect(option)}
                    disabled={isAnswered}
                    className={buttonClasses}
                  >
                    <span className="mr-4 flex-shrink-0 font-mono text-sm text-primary font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {showResult && isCorrect && (
                      <CheckCircle2 className="h-5 w-5 ml-3 flex-shrink-0" />
                    )}
                    {showResult && isSelected && !isCorrect && (
                      <XCircle className="h-5 w-5 ml-3 flex-shrink-0" />
                    )}
                  </Button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="space-y-4 pt-6 border-t border-border animate-fade-in">
                <div className="p-5 rounded-xl bg-muted/50 border border-border">
                  <h4 className="font-bold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Explanation</h4>
                  <p className="text-sm leading-relaxed">{currentQuestion.explanation}</p>
                </div>

                <Button onClick={handleNextQuestion} className="w-full h-12 text-base font-semibold" size="lg">
                  Next Question
                </Button>
              </div>
            )}

            {!isAnswered && (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                Submit Answer
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {showReportModal && currentQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Report Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
              >
                <option>Incorrect answer</option>
                <option>Unclear question</option>
                <option>Typo</option>
                <option>Duplicate</option>
                <option>Other</option>
              </select>
              {reportReason === "Other" && (
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Other reason"
                  value={reportOtherReason}
                  onChange={(event) => setReportOtherReason(event.target.value)}
                />
              )}
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={4}
                placeholder="Optional details"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowReportModal(false)}>Cancel</Button>
                <Button
                  disabled={reportSubmitting || (reportReason === "Other" && !reportOtherReason.trim())}
                  onClick={async () => {
                    try {
                      setReportSubmitting(true);
                      await rtdbPost("question_reports", {
                        eventId,
                        questionId: currentQuestion.id,
                        reason: reportReason === "Other" ? reportOtherReason.trim() : reportReason,
                        details: reportDetails,
                        submittedBy: {
                          uid: user?.uid || "",
                          name: user?.displayName || "",
                          email: user?.email || "",
                        },
                        status: "pending",
                        adminNotes: "",
                        createdAt: new Date().toISOString(),
                      });
                      toast.success("Report submitted.");
                      setShowReportModal(false);
                      setReportReason("Incorrect answer");
                      setReportOtherReason("");
                      setReportDetails("");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Failed to submit report.");
                    } finally {
                      setReportSubmitting(false);
                    }
                  }}
                >
                  {reportSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
