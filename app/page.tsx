"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HOSA_EVENTS_DISPLAY_ORDER as HOSA_EVENTS } from "@/lib/events";
import { FIREBASE_DATABASE_URL } from "@/lib/firebase-config";

const metrics = [
  { label: "Avg Accuracy", value: "89%", detail: "+12% in 4 weeks" },
  { label: "Practice Sessions", value: "14.2", detail: "per learner / week" },
  { label: "Weak Topic Recovery", value: "2.6x", detail: "faster than random review" },
];

const highlights = [
  {
    title: "Precision Practice",
    text: "Question sets are event-specific and adaptive so every session targets what matters.",
    icon: Target,
  },
  {
    title: "Actionable Analytics",
    text: "Readable dashboards show timing, trend lines, and exact weak domains.",
    icon: LineChart,
  },
  {
    title: "Focused Retention",
    text: "Missed concepts automatically return until your confidence catches up.",
    icon: Brain,
  },
];

type ImpactStat = {
  label: string;
  value: number;
  suffix?: string;
};

function countQuestionsInPayload(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === "object") {
    return Object.values(payload as Record<string, unknown>).reduce((sum, value) => sum + countQuestionsInPayload(value), 0);
  }
  return 0;
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [impactStats, setImpactStats] = useState<ImpactStat[]>([
    { label: "Total Question Bank", value: 0 },
    { label: "Registered Users", value: 0 },
    { label: "Questions Attempted", value: 0 },
    { label: "Sessions Completed", value: 0 },
  ]);
  const [animatedImpact, setAnimatedImpact] = useState<number[]>([0, 0, 0, 0]);
  const [impactVisible, setImpactVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.16 }
    );

    document.querySelectorAll(".reveal-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadImpact = async () => {
      const [stats, questionBank] = await Promise.all([
        fetch(`${FIREBASE_DATABASE_URL}/admin_stats/sitewide.json`).then((res) => (res.ok ? res.json() : null)).catch(() => null),
        fetch(`${FIREBASE_DATABASE_URL}/questions.json`).then((res) => (res.ok ? res.json() : null)).catch(() => null),
      ]);

      setImpactStats([
        { label: "Total Question Bank", value: countQuestionsInPayload(questionBank) },
        { label: "Registered Users", value: Number(stats?.adoption?.totalUsers ?? 0) },
        { label: "Questions Attempted", value: Number(stats?.contentAnalytics?.totalQuestionsAttempted ?? 0) },
        { label: "Sessions Completed", value: Number(stats?.engagement?.totalSessionsCompleted ?? 0) },
      ]);
    };

    void loadImpact();
    const interval = window.setInterval(() => {
      void loadImpact();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const el = document.querySelector("#impact-counters");
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImpactVisible(true);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!impactVisible) return;
    let rafId = 0;
    const duration = 1200;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedImpact(impactStats.map((item) => Math.floor(item.value * eased)));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [impactVisible, impactStats]);

  return (
    <div className="app-surface relative min-h-screen overflow-x-hidden">
      <section className="relative border-b border-border/40">
        <div className="hero-grid absolute inset-0" />
        <div className="floating-wave pointer-events-none absolute inset-x-0 top-[-140px] mx-auto h-[300px] w-[72vw] rounded-full" />
        <div className="page-shell section-shell relative pt-6 md:pt-8">
          <div className="mb-10 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image src="/logo.png" alt="StudyRx Logo" width={28} height={28} className="h-7 w-7" />
              <span className="text-lg font-semibold text-foreground">StudyRx</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/signin">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/signup">Get started</Link>
              </Button>
            </div>
          </div>

          <div className="grid items-center gap-8 pt-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="reveal-up space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-2 text-xs font-semibold tracking-wide text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Built for high-performance HOSA prep
              </div>

              <div className="space-y-5">
                <h1 className="max-w-2xl text-4xl font-semibold md:text-5xl lg:text-[3.35rem]">
                  Modern training for students who want to <span className="text-primary">compete sharper.</span>
                </h1>
                <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                  StudyRx gives you event-aligned practice, trend insights, and smarter review loops in one clean system.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Open Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/events">Explore Events</Link>
                </Button>
              </div>
            </div>

            <div className="reveal-up soft-panel p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">Live readiness snapshot</h2>
                <Trophy className="h-4 w-4 text-primary" />
              </div>

              <div className="space-y-4">
                {[
                  { name: "Medical Terminology", score: 92 },
                  { name: "Pharmacology", score: 84 },
                  { name: "Nutrition", score: 79 },
                  { name: "Behavioral Health", score: 88 },
                ].map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-semibold text-primary">{item.score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-border/60 bg-background/65 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-foreground">Questions answered</p>
                  <p className="text-base font-semibold text-primary">214</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/40">
        <div className="page-shell section-shell">
          <div className="reveal-up grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.label} className="glass-card py-0">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{metric.value}</p>
                  <p className="mt-1 text-sm text-primary">{metric.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="impact-counters" className="border-b border-border/40">
        <div className="page-shell section-shell">
          <div className="mb-6 text-center reveal-up">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Impact</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Live platform momentum</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {impactStats.map((item, index) => (
              <Card key={item.label} className="reveal-up">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-primary">
                    {animatedImpact[index].toLocaleString()}
                    {item.suffix ?? ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/40">
        <div className="page-shell section-shell space-y-10">
          <div className="reveal-up flex items-end justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Core product edge</p>
              <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Designed to reduce noise, increase performance.</h2>
            </div>
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link href="/analytics">View analytics</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="reveal-up" style={{ transitionDelay: `${index * 90}ms` }}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-border/40">
        <div className="page-shell section-shell">
          <div className="reveal-up mb-8 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold md:text-4xl">Practice by real HOSA event tracks.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Move across events with one click and keep your momentum.</p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/75 text-primary"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, HOSA_EVENTS.length - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/75 text-primary"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="reveal-up overflow-hidden rounded-2xl border border-border/60 bg-card/70">
            <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {HOSA_EVENTS.map((event) => {
                const Icon = event.icon;
                return (
                  <div key={event.id} className="min-w-full p-6 md:p-8">
                    <div className="grid items-center gap-6 md:grid-cols-[1fr_260px]">
                      <div className="space-y-3">
                        <h3 className="text-2xl font-semibold">{event.name}</h3>
                        <p className="text-sm text-muted-foreground md:text-base">{event.description}</p>
                        <Button asChild size="sm">
                          <Link href={`/practice/${event.id}`}>Start this event</Link>
                        </Button>
                      </div>
                      <div className="soft-panel flex h-44 flex-col justify-between p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommended run</p>
                          <p className="text-sm text-foreground">20 question sprint + weak-topic replay</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/40">
        <div className="page-shell section-shell">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <Card className="reveal-up overflow-hidden p-0">
              <CardContent className="p-0">
                <Image
                  src="/22905-6-health-file.png"
                  alt="Healthcare study illustration"
                  width={1200}
                  height={900}
                  className="h-64 w-full object-cover"
                />
                <div className="space-y-3 p-5">
                  <h3 className="text-2xl font-semibold">Clean workflows for content-heavy prep.</h3>
                  <p className="text-sm text-muted-foreground">Your dashboard, sessions, and review surfaces use one design language for less friction and better focus.</p>
                </div>
              </CardContent>
            </Card>

            <div className="reveal-up space-y-4">
              {["Choose an event.", "Run a focused session.", "Use feedback loops.", "Track trend progression."].map((line, index) => (
                <div
                  key={line}
                  className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/70 px-4 py-3"
                  style={{ transitionDelay: `${index * 70}ms` }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-sm font-semibold text-primary">{index + 1}</div>
                  <p className="text-sm md:text-base">{line}</p>
                  {index === 1 ? <Timer className="ml-auto h-4 w-4 text-primary" /> : <BarChart3 className="ml-auto h-4 w-4 text-primary" />}
                </div>
              ))}
              <Button asChild size="lg" className="mt-2">
                <Link href="/auth/signup">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 bg-background/40 backdrop-blur-sm">
        <div className="page-shell flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="StudyRx" width={24} height={24} className="h-6 w-6" />
            <span className="font-medium text-foreground">StudyRx</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2026 StudyRx</span>
            <Link href="/contributors" className="text-primary hover:underline">
              Contributors
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
