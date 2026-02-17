"use client";

import { useState, useEffect, useMemo, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { storage, type Question, type SessionData } from "@/lib/storage";
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

  useEffect(() => {
    loadQuestions();
  }, [eventId]);

  const loadQuestions = async () => {
    if (!event) {
      setLoadError(true);
      return;
    }

    try {
      const res = await fetch(event.questionBankFile);
      if (!res.ok) throw new Error("Failed to load questions");
      
      const questions: Question[] = await res.json();
      setAllQuestions(questions);
      
      const completedQuestions = await storage.getCompletedQuestions(eventId);
      
      const remainingQuestions = questions.filter(
        q => !completedQuestions.includes(q.id)
      );
      
      if (remainingQuestions.length === 0) {
        setIsComplete(true);
        setShowConfetti(true);
      } else {
        const shuffled = shuffleArray(remainingQuestions);
        const queue: QueueItem[] = shuffled.map(q => ({
          questionId: q.id,
          isRedemption: false
        }));
        setQuestionQueue(queue);
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
      void storage.addCompletedQuestion(eventId, currentQuestion.id);
      if (currentQueueItem.isRedemption) {
        void storage.removeWrongQuestion(eventId, currentQuestion.id);
      }
    } else {
      setIncorrectCount(prev => prev + 1);
      if (!currentQueueItem.isRedemption) {
        void storage.addWrongQuestion(eventId, currentQuestion.id);
      }
      
      const remainingInQueue = questionQueue.length - currentQueueIndex - 1;
      const insertPosition = Math.min(50, remainingInQueue);
      const insertIndex = currentQueueIndex + 1 + insertPosition;
      
      const newQueueItem: QueueItem = {
        questionId: currentQuestion.id,
        isRedemption: true
      };
      
      setQuestionQueue(prev => {
        const newQueue = [...prev];
        newQueue.splice(insertIndex, 0, newQueueItem);
        return newQueue;
      });
    }

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

      const totalQuestions = attemptsWithExplanation.length;
      const sessionCorrectCount = attemptsWithExplanation.filter((a) => a.isCorrect).length;
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

  const handleEndSession = async () => {
    if (!sessionData) {
      router.push("/events");
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

    const totalQuestions = attemptsWithFinalExplanation.length;
    const correct = attemptsWithFinalExplanation.filter((attempt) => attempt.isCorrect).length;
    const totalThinkTime = attemptsWithFinalExplanation.reduce((sum, attempt) => sum + attempt.thinkTime, 0);
    const totalExplanationTime = attemptsWithFinalExplanation.reduce((sum, attempt) => sum + attempt.explanationTime, 0);
    const highestStreak = attemptsWithFinalExplanation.reduce(
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
      setSessionData(finishedSession);
      setSessionSummary({
        totalQuestions,
        correct,
        incorrect: totalQuestions - correct,
        highestStreak,
        sessionTime: totalThinkTime + totalExplanationTime,
      });
    } catch (error) {
      console.error("Failed to save session", error);
      setSessionSaveError("Couldn't save your session. Please try ending again.");
    } finally {
      setIsEndingSession(false);
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  if (loadError || !event) {
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
          
          <Card className="border-primary/20 shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Icon className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-4xl font-bold">{eventName}</CardTitle>
              <p className="text-muted-foreground text-lg font-light">
                {event.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 p-6 bg-muted/30 rounded-xl">
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
                    <h4 className="font-semibold mb-1">Redemption System</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Questions you miss will reappear later with shuffled answers for another chance
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
                      Practice continues until you get every question right, including redemptions
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={startPractice}
                size="lg"
                className="w-full text-lg h-14 font-semibold shadow-lg"
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
          <Card className="border-primary/20 shadow-2xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/20 to-chart-3/20 flex items-center justify-center animate-pulse">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-5xl font-bold">Congratulations!</CardTitle>
              <p className="text-muted-foreground text-xl font-light">
                You've completed all questions for {eventName}!
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-8 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl text-center border border-primary/20">
                <h3 className="text-3xl font-bold mb-3">Event Complete</h3>
                <p className="text-muted-foreground text-lg">
                  You've mastered all available questions. Keep reviewing to maintain your knowledge!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-6 bg-muted/50 rounded-xl border border-border">
                  <div className="text-3xl font-bold text-primary font-mono">{totalAnswered}</div>
                  <div className="text-sm text-muted-foreground mt-2">Answered</div>
                </div>
                <div className="text-center p-6 bg-muted/50 rounded-xl border border-border">
                  <div className="text-3xl font-bold text-accent font-mono">{correctCount}</div>
                  <div className="text-sm text-muted-foreground mt-2">Correct</div>
                </div>
                <div className="text-center p-6 bg-muted/50 rounded-xl border border-border">
                  <div className="text-3xl font-bold text-destructive font-mono">{incorrectCount}</div>
                  <div className="text-sm text-muted-foreground mt-2">Incorrect</div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleEndSession} size="lg" className="flex-1 h-14 text-base">
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
      {sessionSummary && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full glass-card tech-border">
            <CardHeader>
              <CardTitle className="text-3xl">Session Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Total questions answered</div>
                  <div className="text-2xl font-bold">{sessionSummary.totalQuestions}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Correct questions</div>
                  <div className="text-2xl font-bold text-accent">{sessionSummary.correct}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Incorrect questions</div>
                  <div className="text-2xl font-bold text-destructive">{sessionSummary.incorrect}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Highest streak</div>
                  <div className="text-2xl font-bold">{sessionSummary.highestStreak}</div>
                </div>
                <div className="rounded-lg border p-4 md:col-span-2">
                  <div className="text-xs text-muted-foreground">Session time</div>
                  <div className="text-2xl font-bold">{formatDuration(sessionSummary.sessionTime)}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => router.push("/events")}>Back to Events</Button>
                <Button variant="outline" className="flex-1 bg-transparent" onClick={handleRestart}>Practice Again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="border-b border-border/60 bg-card/70 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
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
            <Button
              onClick={handleEndSession}
              variant="outline"
              size="sm"
              className="bg-transparent font-semibold"
              disabled={isEndingSession}
            >
              {isEndingSession ? "Saving..." : "End Session"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {sessionSaveError && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {sessionSaveError}
          </div>
        )}
        <Card className="glass-card tech-border shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,theme(colors.accent/20),transparent_40%)] pointer-events-none" />
          <CardHeader>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${((currentQueueIndex + 1) / questionQueue.length) * 100}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono mb-2">Question {currentQueueIndex + 1} / {questionQueue.length}</div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {currentQueueItem.isRedemption && (
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/30 px-5 py-2 text-sm font-bold">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span className="text-accent">REDEMPTION</span>
                </div>
              )}
              
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
                    buttonClasses += " border-accent bg-accent/10 text-accent hover:bg-accent/10";
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
                    <span className="mr-4 flex-shrink-0 font-mono text-sm text-muted-foreground font-bold">
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
    </div>
  );
}
