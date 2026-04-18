"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LineChart,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HOSA_EVENTS_DISPLAY_ORDER as HOSA_EVENTS } from "@/lib/events";
import { FIREBASE_DATABASE_URL } from "@/lib/firebase-config";
import { getStoredAuth } from "@/lib/rtdb";

/* ─── helpers ─────────────────────────────────────────── */

function countQuestionsInPayload(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === "object") {
    return Object.values(payload as Record<string, unknown>).reduce(
      (sum, v) => sum + countQuestionsInPayload(v),
      0,
    );
  }
  return 0;
}

async function fetchRealtimeJson(path: string) {
  const auth = await getStoredAuth().catch(() => null);
  const authedUrl = auth?.idToken
    ? `${FIREBASE_DATABASE_URL}/${path}.json?auth=${encodeURIComponent(auth.idToken)}`
    : null;
  if (authedUrl) {
    const r = await fetch(authedUrl).catch(() => null);
    if (r?.ok) return r.json();
  }
  const r = await fetch(`${FIREBASE_DATABASE_URL}/${path}.json`).catch(() => null);
  if (r?.ok) return r.json();
  return null;
}

/* ─── scroll reveal hook ─────────────────────────────── */

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll(".reveal-up, .reveal-left, .reveal-right, .reveal-scale, .section-reveal")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ─── underline draw hook ─────────────────────────────── */

function useUnderlineReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll(".squiggle-path").forEach((path) => {
              path.classList.add("drawn");
            });
            entry.target.querySelectorAll(".underline-highlight").forEach((el) => {
              el.classList.add("in-view");
            });
          }
        });
      },
      { threshold: 0.2 },
    );
    document.querySelectorAll(".underline-trigger").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ─── static data ─────────────────────────────────────── */

const metrics = [
  { label: "Avg Accuracy", value: "89%", detail: "+12% in 4 weeks" },
  { label: "Practice Sessions", value: "14.2", detail: "per learner / week" },
  { label: "Weak Topic Recovery", value: "2.6x", detail: "faster than random review" },
];

const features = [
  {
    title: "Precision Practice",
    text: "Question sets are event-specific so every session targets what matters for your competitive event.",
    icon: Target,
  },
  {
    title: "Actionable Analytics",
    text: "Readable dashboards show timing, trend lines, and exact weak domains so you know where to focus.",
    icon: LineChart,
  },
  {
    title: "Focused Retention",
    text: "Missed concepts automatically return until your confidence catches up — no manual review needed.",
    icon: Brain,
  },
];

const howItWorksSteps = [
  {
    step: "01",
    title: "Choose your event",
    desc: "Select from a library of HOSA competitive events — Medical Terminology, Anatomy, Pharmacology, and more.",
    icon: BookOpen,
  },
  {
    step: "02",
    title: "Run a focused session",
    desc: "Answer curated questions with a built-in timer. Timed or practice mode — you decide the pace.",
    icon: Timer,
  },
  {
    step: "03",
    title: "Get instant feedback",
    desc: "Explanations appear right after each answer so you learn immediately, not at the end.",
    icon: CheckCircle2,
  },
  {
    step: "04",
    title: "Track trend progression",
    desc: "Your analytics dashboard shows accuracy over time, average response speed, and weak domains.",
    icon: LineChart,
  },
];

const mistakeFeatures = [
  {
    title: "Automatic mistake capture",
    desc: "Every wrong answer is captured and tagged by topic so nothing slips through the cracks.",
    icon: XCircle,
  },
  {
    title: "Spaced review loops",
    desc: "Missed questions resurface in future sessions at optimal intervals, boosting long-term retention.",
    icon: RefreshCw,
  },
  {
    title: "Weak topic heat maps",
    desc: "See exactly which subtopics you consistently miss so you can target them with surgical precision.",
    icon: Target,
  },
  {
    title: "Redemption rounds",
    desc: "At the end of each session, get a second shot at every question you got wrong — confidence-building by design.",
    icon: Trophy,
  },
];

const testimonials = [
  {
    quote: "StudyRx completely changed how I prep for Medical Terminology. The mistake tracking is insanely useful — I went from 74% to 91% accuracy in three weeks.",
    name: "Priya M.",
    role: "HOSA State Qualifier, TX",
  },
  {
    quote: "The timed mode is exactly what I needed to simulate competition pressure. And seeing my weak topics laid out clearly? Game changer.",
    name: "James K.",
    role: "HOSA Member, CA Chapter",
  },
  {
    quote: "I love that wrong answers come back to haunt me until I actually know them. It's like having a coach who never forgets.",
    name: "Aaliyah T.",
    role: "HOSA Competitor, FL",
  },
];

/* ─── components ────────────────────────────��─────────── */

const readinessTopics = [
  { name: "Skeletal System",    accuracy: 91, total: 48 },
  { name: "Muscular System",    accuracy: 84, total: 36 },
  { name: "Cardiovascular",     accuracy: 77, total: 52 },
  { name: "Nervous System",     accuracy: 88, total: 44 },
  { name: "Respiratory System", accuracy: 73, total: 30 },
  { name: "Endocrine System",   accuracy: 82, total: 27 },
];

function HeroReadinessCard() {
  return (
    <div className="reveal-right soft-panel p-6">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Readiness Snapshot
        </p>
        <Trophy className="h-4 w-4 text-primary" />
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Anatomy &amp; Physiology · by system</p>
      <div className="space-y-3">
        {readinessTopics.map((item) => {
          return (
            <div key={item.name}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">{item.total}q</span>
                  <span className="text-xs font-semibold tabular-nums text-primary">
                    {item.accuracy}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${item.accuracy}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Total questions answered</p>
          <p className="text-sm font-semibold tabular-nums text-primary">
            {readinessTopics.reduce((s, t) => s + t.total, 0)}
          </p>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Overall accuracy</p>
          <p className="text-sm font-semibold tabular-nums text-primary">
            {Math.round(
              readinessTopics.reduce((s, t) => s + t.accuracy, 0) / readinessTopics.length
            )}%
          </p>
        </div>
      </div>
    </div>
  );
}

function QuestionMockCard({ fillHeight }: { fillHeight?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = [
    { letter: "A", text: "Osteitis" },
    { letter: "B", text: "Osteomalacia" },
    { letter: "C", text: "Osteoma" },
    { letter: "D", text: "Osteotomy" },
  ];
  const correct = "B";
  const revealed = selected !== null;

  return (
    <div className={fillHeight ? "h-full" : ""}>
      <div className={`question-mock relative ${fillHeight ? "h-full flex flex-col" : ""}`}>
        {/* timer badge */}
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-mono font-semibold text-muted-foreground">
          <Clock className="h-3 w-3 animate-timer-pulse text-primary" />
          <span className="animate-timer-pulse">0:28</span>
        </div>

        {/* prompt label */}
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
          Sample prompt · Medical Terminology
        </p>

        <h3 className="mb-5 text-base font-semibold leading-snug text-foreground md:text-[1.05rem]">
          Which term means abnormal softening of bone?
        </h3>

        <div className="space-y-2">
          {options.map((opt) => {
            const isCorrect = opt.letter === correct;
            const isSelected = opt.letter === selected;
            let bg = "border-border bg-background hover:border-primary/40 cursor-pointer";
            if (revealed) {
              if (isCorrect) bg = "border-green-500/60 bg-green-50 dark:bg-green-950/30 cursor-default";
              else if (isSelected) bg = "border-red-400/60 bg-red-50 dark:bg-red-950/30 cursor-default";
              else bg = "border-border bg-background opacity-50 cursor-default";
            }
            return (
              <button
                key={opt.letter}
                onClick={() => !revealed && setSelected(opt.letter)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm text-left transition-colors ${bg}`}
              >
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    revealed && isCorrect
                      ? "bg-green-500 text-white"
                      : revealed && isSelected
                        ? "bg-red-400 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {opt.letter}
                </span>
                <span className={revealed && isCorrect ? "font-medium text-foreground" : "text-foreground"}>
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              {selected === correct ? "Correct!" : `You picked ${selected}. Correct answer is B — Osteomalacia.`}
            </p>
            <p className="mt-1 text-muted-foreground">
              <span className="font-medium text-foreground">Osteomalacia</span> combines{" "}
              <em>osteo-</em> (bone) + <em>-malacia</em> (softening), commonly caused by vitamin D
              deficiency. This question is now in your{" "}
              <span className="font-medium text-primary">mistake queue</span> for follow-up review.
            </p>
          </div>
        )}

        {!revealed && (
          <p className="mt-4 text-xs text-muted-foreground">Click an option to see the explanation</p>
        )}
      </div>
    </div>
  );
}

type ImpactStat = { label: string; value: number; suffix?: string };

/* ─── main page ───────────────────────────────────────── */

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
  const heroRef = useRef<HTMLDivElement>(null);

  useReveal();
  useUnderlineReveal();

  /* hero squiggle on mount */
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll(".squiggle-path").forEach((p) => p.classList.add("drawn"));
      document.querySelectorAll(".underline-highlight").forEach((el) => el.classList.add("in-view"));
    }, 400);
    return () => clearTimeout(t);
  }, []);

  /* live stats */
  useEffect(() => {
    const load = async () => {
      const [stats, packs] = await Promise.all([
        fetchRealtimeJson("admin_stats/sitewide"),
        Promise.all(
          HOSA_EVENTS.map((e) =>
            fetch(`/questions/${e.id}.json`)
              .then((r) => (r.ok ? r.json() : []))
              .catch(() => []),
          ),
        ),
      ]);
      const localCount = packs.reduce(
        (s, p) => s + (Array.isArray(p) ? p.length : countQuestionsInPayload(p)),
        0,
      );
      const dbCount = Number((stats as any)?.contentAnalytics?.totalQuestionsAvailable ?? 0);
      const totalQ = Math.max(localCount, dbCount);
      const liveUsers = Number(stats?.adoption?.totalUsers ?? 0);
      const liveAttempted = Number(stats?.contentAnalytics?.totalQuestionsAttempted ?? 0);
      const liveSessions = Number(stats?.engagement?.totalSessionsCompleted ?? 0);
      const hasLive = liveUsers > 0 || liveAttempted > 0 || liveSessions > 0;
      const cached = typeof window !== "undefined"
        ? (JSON.parse(window.localStorage.getItem("studyrx_live_impact") ?? "null") as {
            users: number; attempted: number; sessions: number;
          } | null)
        : null;
      const finalUsers = hasLive ? liveUsers : (cached?.users ?? 0);
      const finalAttempted = hasLive ? liveAttempted : (cached?.attempted ?? 0);
      const finalSessions = hasLive ? liveSessions : (cached?.sessions ?? 0);
      if (hasLive && typeof window !== "undefined") {
        window.localStorage.setItem(
          "studyrx_live_impact",
          JSON.stringify({ users: liveUsers, attempted: liveAttempted, sessions: liveSessions }),
        );
      }
      setImpactStats([
        { label: "Total Question Bank", value: totalQ },
        { label: "Registered Users", value: finalUsers },
        { label: "Questions Attempted", value: finalAttempted },
        { label: "Sessions Completed", value: finalSessions },
      ]);
    };
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  /* counter animation */
  useEffect(() => {
    const el = document.querySelector("#impact-counters");
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setImpactVisible(true); }),
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!impactVisible) return;
    let raf = 0;
    const dur = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setAnimatedImpact(impactStats.map((s) => Math.floor(s.value * e)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [impactVisible, impactStats]);

  return (
    <div className="app-surface relative min-h-screen overflow-x-hidden bg-background">

      {/* ── Navbar ───────────────────────────────────────── */}
      <header className="site-nav">
        <div className="page-shell flex h-14 items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/logo.png" alt="StudyRx" width={26} height={26} className="h-6.5 w-6.5" />
            <span className="font-heading text-base font-semibold text-foreground">StudyRx</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Button asChild variant="ghost" size="sm" className="text-sm">
              <Link href="/auth/signin">Log in</Link>
            </Button>
            <Button asChild size="sm" className="text-sm">
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative border-b border-border" ref={heroRef}>
        <div className="hero-grid absolute inset-0 pointer-events-none" />
        <div className="page-shell section-shell relative">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-7 reveal-up underline-trigger">
              <div className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary">
                <span className="badge-shimmer pointer-events-none absolute inset-0" />
                <Sparkles className="h-3 w-3" />
                Built for high-performance HOSA prep
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.16] text-foreground md:text-5xl lg:text-[3.1rem]">
                Train smarter for the events that{" "}
                <span className="squiggle-wrap text-primary">
                  matter most.
                  <svg viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path
                      className="squiggle-path"
                      d="M2 8 C40 3, 80 11, 120 6 C160 1, 200 10, 240 5 C265 2, 285 8, 298 6"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                StudyRx gives you event-aligned practice, adaptive mistake review, and performance
                analytics in one clean system — so you compete sharper.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="btn-glow">
                  <Link href="/dashboard">
                    Open Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/events">Explore Events</Link>
                </Button>
              </div>
            </div>
            <HeroReadinessCard />
          </div>
        </div>
      </section>

      {/* ── Metrics bar ──────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="page-shell section-shell !py-10 section-reveal">
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className="rounded-xl border border-border bg-card px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{m.label}</p>
                <p className="mt-1.5 text-3xl font-semibold text-foreground">{m.value}</p>
                <p className="mt-0.5 text-sm text-primary">{m.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live impact counters ──────────────────────────── */}
      <section id="impact-counters" className="border-b border-border">
        <div className="page-shell section-shell">
          <div className="reveal-up mb-10 text-center underline-trigger">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Impact</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">
              <span className="underline-highlight">Live platform momentum</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {impactStats.map((item, idx) => (
              <div
                key={item.label}
                className="reveal-up rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm"
                style={{ transitionDelay: `${idx * 80}ms` }}
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">
                  {animatedImpact[idx].toLocaleString()}
                  {item.suffix ?? ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core features ─────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="page-shell section-shell space-y-12">
          <div className="reveal-up underline-trigger">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Core product edge</p>
            <h2 className="mt-3 max-w-lg text-3xl font-semibold md:text-4xl">
              Designed to reduce noise,{" "}
              <span className="underline-highlight">increase performance.</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="reveal-up group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:bg-primary/[0.02] hover:-translate-y-1 hover:shadow-md"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how-it-works" className="border-b border-border">
        <div className="page-shell section-shell">
          <div className="grid items-stretch gap-8 lg:grid-cols-2">
            {/* left: steps */}
            <div className="reveal-left underline-trigger flex flex-col justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">How it works</p>
                <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
                  Four steps from{" "}
                  <span className="underline-highlight">zero to competition-ready.</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  StudyRx removes friction at every step so you spend more time learning and less
                  time figuring out what to study next.
                </p>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-3">
                {howItWorksSteps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.step}
                      className="flex gap-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 transition-all duration-200 hover:border-primary/50"
                      style={{ transitionDelay: `${i * 70}ms` }}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                      </div>
                      <Icon className="ml-auto mt-0.5 h-4 w-4 flex-shrink-0 self-start text-primary/60" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* right: interactive question mock — full height */}
            <div className="reveal-right flex flex-col">
              <QuestionMockCard fillHeight />
            </div>
          </div>
        </div>
      </section>

      {/* ── Mistake tracking ─────────────────────────────── */}
      <section id="mistake-tracking" className="border-b border-border">
        <div className="page-shell section-shell space-y-12">
          <div className="reveal-up underline-trigger text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Mistake tracking</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Your mistakes become your{" "}
              <span className="underline-highlight">biggest advantage.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Most prep tools move on after a wrong answer. StudyRx captures every miss, surfaces it
              at the right time, and keeps drilling until you genuinely know it — not just recognize it.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {mistakeFeatures.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="reveal-up group flex gap-4 rounded-xl border border-border bg-card px-5 py-5 transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm"
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* mini stat strip */}
          <div className="reveal-up grid gap-px overflow-hidden rounded-xl border border-primary/20 md:grid-cols-3">
            {[
              { value: "2.6x", label: "Faster weak-topic recovery vs. random review" },
              { value: "94%", label: "Of users report meaningful score gains in 30 days" },
              { value: "100%", label: "Of missed questions resurface before your next session" },
            ].map((stat) => (
              <div key={stat.label} className="bg-primary/5 px-6 py-5">
                <p className="text-2xl font-semibold text-primary">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Events carousel ───────────────────────────────── */}
      <section id="events" className="border-b border-border">
        <div className="page-shell section-shell section-reveal">
          <div className="mb-8 flex items-end justify-between gap-6 underline-trigger">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Events</p>
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">
                Practice by real{" "}
                <span className="underline-highlight">HOSA event tracks.</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Move across events with one click and keep your momentum.
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => setCurrentSlide((p) => Math.max(p - 1, 0))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentSlide((p) => Math.min(p + 1, HOSA_EVENTS.length - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {HOSA_EVENTS.map((event) => {
                const Icon = event.icon;
                return (
                  <div key={event.id} className="min-w-full p-6 md:p-8">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-foreground">{event.name}</h3>
                        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">
                          {event.description}
                        </p>
                        <div className="mt-4">
                          <Button asChild size="sm">
                            <Link href={`/practice/${event.id}`}>Start this event</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* dot indicators */}
          <div className="mt-4 flex justify-center gap-1.5">
            {HOSA_EVENTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentSlide ? "w-5 bg-primary" : "w-1.5 bg-border"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="page-shell section-shell section-reveal">
          <div className="mb-10 underline-trigger">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Testimonials</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">
              From students who{" "}
              <span className="underline-highlight">competed and won.</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="reveal-up flex flex-col justify-between rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div>
                  <svg
                    viewBox="0 0 32 24"
                    fill="currentColor"
                    className="mb-3 h-7 w-7 text-primary/30"
                    aria-hidden="true"
                  >
                    <path d="M0 24V14.4C0 9.6 1.6 5.6 4.8 2.4 8 .8 11.6 0 15.6 0v4.8c-2.4 0-4.4.8-6 2.4-1.6 1.6-2.4 3.6-2.4 6v1.2H12V24H0zm16 0V14.4c0-4.8 1.6-8.8 4.8-12C24 .8 27.6 0 31.6 0v4.8c-2.4 0-4.4.8-6 2.4-1.6 1.6-2.4 3.6-2.4 6v1.2H28V24H16z" />
                  </svg>
                  <p className="text-sm leading-relaxed text-foreground">{t.quote}</p>
                </div>
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="page-shell section-shell text-center">
          <div className="reveal-scale mx-auto max-w-lg space-y-6">
            <h2 className="text-3xl font-semibold md:text-4xl">Ready to compete sharper?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Join students already using StudyRx to hit their accuracy goals and walk into
              competitions with confidence.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/auth/signup">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="page-shell flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="StudyRx" width={22} height={22} className="h-5.5 w-5.5" />
            <span className="font-semibold text-foreground">StudyRx</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2026 StudyRx</span>
            <Link href="/contributors" className="hover:text-foreground transition-colors">
              Contributors
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
