"use client";

import { useState, useEffect, useMemo, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { storage, type Question, type SessionData } from "@/lib/storage";
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
      <AppSidebar />
      <SidebarInset>
        <PracticeContent eventId={resolvedParams.event} />
      </SidebarInset>
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
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [explanationStartTime, setExplanationStartTime] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const pausedDurationRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);

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
      
      const completedQuestions = storage.getCompletedQuestions(eventId);
      
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

  useEffect(() => {
    if (!hasStarted || isAnswered) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pauseStartRef.current === null) {
          pauseStartRef.current = Date.now();
        }
      } else if (pauseStartRef.current !== null) {
        pausedDurationRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasStarted, isAnswered]);

  const startPractice = () => {
    const now = Date.now();
    const newSession: SessionData = {
      sessionId: `session_${now}_${Math.random().toString(36).slice(2, 8)}`,
      sessionType: "practice",
      attempts: [],
      startTimestamp: new Date(now).toISOString(),
      eventId,
      eventName,
      totalThinkTime: 0,
      totalExplanationTime: 0,
      totalQuestions: 0,
      correctCount: 0,
      accuracy: 0,
    };
    setSessionData(newSession);
    setQuestionStartTime(now);
    pausedDurationRef.current = 0;
    pauseStartRef.current = null;
    setHasStarted(true);
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !sessionData || !currentQuestion || !currentQueueItem) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const now = Date.now();
    if (pauseStartRef.current !== null) {
      pausedDurationRef.current += now - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    const thinkTimeMs = Math.max(0, now - questionStartTime - pausedDurationRef.current);
    const thinkTime = Number((thinkTimeMs / 1000).toFixed(2));

    const attempt = {
      questionId: currentQuestion.id,
      questionIndex: sessionData.attempts.length + 1,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      isCorrect,
      thinkTime,
      explanationTime: 0,
      timestampStart: new Date(questionStartTime).toISOString(),
      timestampSubmit: new Date(now).toISOString(),
      isRedemption: currentQueueItem.isRedemption,
      eventId,
    };

    const updatedSession = {
      ...sessionData,
      attempts: [...sessionData.attempts, attempt],
    };
    setSessionData(updatedSession);
    storage.setCurrentSession(updatedSession);
    setExplanationStartTime(now);

    setTotalAnswered(prev => prev + 1);
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      storage.addCompletedQuestion(eventId, currentQuestion.id);
      if (currentQueueItem.isRedemption) {
        storage.removeWrongQuestion(eventId, currentQuestion.id);
      }
    } else {
      setIncorrectCount(prev => prev + 1);
      if (!currentQueueItem.isRedemption) {
        storage.addWrongQuestion(eventId, currentQuestion.id);
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
    if (sessionData && explanationStartTime !== null) {
      const now = Date.now();
      const explanationTime = Number(((now - explanationStartTime) / 1000).toFixed(2));
      const updatedAttempts = [...sessionData.attempts];
      const lastAttempt = updatedAttempts[updatedAttempts.length - 1];
      if (lastAttempt) {
        updatedAttempts[updatedAttempts.length - 1] = {
          ...lastAttempt,
          explanationTime,
        };
      }
      const updatedSession = {
        ...sessionData,
        attempts: updatedAttempts,
      };
      setSessionData(updatedSession);
      storage.setCurrentSession(updatedSession);
    }
    setExplanationStartTime(null);
    const nextIndex = currentQueueIndex + 1;
    
    if (nextIndex >= questionQueue.length) {
      setIsComplete(true);
      setShowConfetti(true);
      return;
    }

    setCurrentQueueIndex(nextIndex);
    setSelectedAnswer(null);
    setIsAnswered(false);
    const now = Date.now();
    setQuestionStartTime(now);
    pausedDurationRef.current = 0;
    pauseStartRef.current = null;
  };

  const handleEndSession = () => {
    if (sessionData) {
      let updatedSession = sessionData;
      if (explanationStartTime !== null && sessionData.attempts.length > 0) {
        const now = Date.now();
        const explanationTime = Number(((now - explanationStartTime) / 1000).toFixed(2));
        const updatedAttempts = [...sessionData.attempts];
        const lastAttempt = updatedAttempts[updatedAttempts.length - 1];
        if (lastAttempt) {
          updatedAttempts[updatedAttempts.length - 1] = {
            ...lastAttempt,
            explanationTime,
          };
        }
        updatedSession = {
          ...sessionData,
          attempts: updatedAttempts,
        };
      }
      const totalThinkTime = updatedSession.attempts.reduce(
        (sum, attempt) => sum + attempt.thinkTime,
        0
      );
      const totalExplanationTime = updatedSession.attempts.reduce(
        (sum, attempt) => sum + attempt.explanationTime,
        0
      );
      const totalQuestions = updatedSession.attempts.length;
      const correctCount = updatedSession.attempts.filter((attempt) => attempt.isCorrect).length;
      const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      const finishedSession = {
        ...updatedSession,
        endTimestamp: new Date().toISOString(),
        totalThinkTime: Number(totalThinkTime.toFixed(2)),
        totalExplanationTime: Number(totalExplanationTime.toFixed(2)),
        totalQuestions,
        correctCount,
        accuracy: Number(accuracy.toFixed(2)),
      };
      storage.saveSession(finishedSession);
    }
    router.push("/events");
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
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
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
            <Button onClick={handleEndSession} variant="outline" size="sm" className="bg-transparent font-semibold">
              End Session
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Card className="border-primary/20 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
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

                let buttonClasses = "w-full justify-start text-left h-auto py-4 px-6 text-base font-medium transition-all bg-transparent hover:bg-primary/5";
                
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
