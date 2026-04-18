"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BarChart3, Brain, Check, ChevronLeft, ChevronRight, Clock, Quote, RefreshCw, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { HOSA_EVENTS_DISPLAY_ORDER as HOSA_EVENTS } from "@/lib/events";

const METRICS = [
  { label: "Accuracy lift", value: "+17%", hint: "Two week average", icon: TrendingUp },
  { label: "Avg response", value: "31s", hint: "Target pace", icon: Clock },
  { label: "Review completion", value: "94%", hint: "With correction loop", icon: RefreshCw },
  { label: "Consistency", value: "4.6x", hint: "Faster retention", icon: Brain },
];

const COMPARISON_ROWS = [
  { category: "Method", studyrx: "Active recall", alt: "Passive review" },
  { category: "Feedback", studyrx: "Targeted correction", alt: "Little to none" },
  { category: "Adaptation", studyrx: "Adaptive loops", alt: "Static material" },
  { category: "Coverage", studyrx: "Event specific", alt: "Mixed quality" },
  { category: "Progress", studyrx: "Weak topic alerts", alt: "No clear next step" },
];

const TESTIMONIALS = [
  {
    quote: "I finally stopped guessing. The weak topic queue built my study plan for me.",
    name: "Ari K",
    event: "Medical Terminology",
    result: "Top 5 at SLC",
  },
  {
    quote: "The review loop kept bringing back what I missed until it actually stuck.",
    name: "Maya R",
    event: "Pathophysiology",
    result: "ILC qualifier",
  },
  {
    quote: "This feels like real training. Every session tells me exactly what to do next.",
    name: "Jordan T",
    event: "Behavioral Health",
    result: "Second at Regionals",
  },
  {
    quote: "Our chapter workflow got way stronger once we switched to focused event practice.",
    name: "Rylan P",
    event: "Pharmacology",
    result: "SLC finalist",
  },
];

export default function HomePage() {
  const [activeEvent, setActiveEvent] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("animate-in");
        });
      },
      { threshold: 0.14 }
    );

    document.querySelectorAll(".fade-in-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const stackedEvents = useMemo(() => {
    const previous = HOSA_EVENTS[(activeEvent - 1 + HOSA_EVENTS.length) % HOSA_EVENTS.length];
    const current = HOSA_EVENTS[activeEvent];
    const next = HOSA_EVENTS[(activeEvent + 1) % HOSA_EVENTS.length];
    return [previous, current, next];
  }, [activeEvent]);

  const currentTestimonial = TESTIMONIALS[activeTestimonial];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background pb-16">
      <section className="relative overflow-hidden pt-20 md:pt-24 lg:pt-28">
        <div className="absolute inset-0 -z-20 bg-background" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--primary)_15%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--primary)_12%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-55" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_10%,color-mix(in_oklab,var(--primary)_16%,transparent)_0%,transparent_44%),radial-gradient(circle_at_84%_20%,color-mix(in_oklab,var(--accent)_12%,transparent)_0%,transparent_46%),linear-gradient(to_bottom,transparent_58%,color-mix(in_oklab,var(--background)_98%,white)_100%)]" />

        <div className="container relative pb-20 md:pb-24">
          <div className="absolute right-0 top-0 z-20 flex gap-3">
            <Button asChild variant="outline" className="bg-background/80 backdrop-blur-xl">
              <Link href="/auth/signin">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>

          <div className="mx-auto max-w-5xl text-center fade-in-section">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/75 px-6 py-2 backdrop-blur-xl">
              <Image src="/logo.png" alt="StudyRx Logo" width={28} height={28} className="h-7 w-7" />
              <span className="text-sm font-semibold text-foreground">StudyRx · HOSA Competitive Prep</span>
            </div>

            <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Train with purpose
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-[shimmer_3.6s_ease-in-out_infinite]">
                Compete with confidence
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-3xl text-base text-muted-foreground md:text-lg">
              StudyRx gives HOSA students structured practice, targeted correction, and clear progress signals so every session improves real outcomes.
            </p>

            <div className="mb-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="min-w-44">
                <Link href="/auth/signup">
                  Start Practicing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-w-44">
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {METRICS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="glass-card fade-in-section rounded-2xl border-border/50 px-4 py-4 text-left" style={{ transitionDelay: `${idx * 70}ms` }}>
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
                    <p className="text-sm text-primary">{item.hint}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-8 text-center fade-in-section">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">How StudyRx is different</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">Quizlet, random PDFs, and textbook notes can help, but they rarely build competition readiness on their own.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/80 fade-in-section">
          <table className="w-full text-left text-sm md:text-base">
            <thead className="bg-primary/8 text-foreground">
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 font-semibold">Dimension</th>
                <th className="px-4 py-3 font-semibold text-primary">StudyRx</th>
                <th className="px-4 py-3 font-semibold">Traditional stack</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.category} className="border-b border-border/30 last:border-none">
                  <td className="px-4 py-3 font-medium text-foreground">{row.category}</td>
                  <td className="px-4 py-3 text-primary">{row.studyrx}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.alt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Inside a practice session</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">A concrete example so the system feels real before you even start.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] fade-in-section">
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-8">
              <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Sample prompt · Medical Terminology</p>
              <p className="mb-5 text-lg font-semibold text-foreground">Which term means abnormal softening of bone?</p>
              <div className="grid gap-3 md:grid-cols-2">
                {["Osteitis", "Osteomalacia", "Osteoma", "Osteotomy"].map((option, idx) => (
                  <div key={option} className={`rounded-xl border px-4 py-3 text-sm ${idx === 1 ? "border-primary/35 bg-primary/10 text-foreground" : "border-border/50 bg-background/60 text-muted-foreground"}`}>
                    {String.fromCharCode(65 + idx)}. {option}
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm text-muted-foreground">
                You picked A. Correct answer is B Osteomalacia. Explanation appears instantly and this item enters your mistake queue for follow up review.
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-8">
              <h3 className="mb-5 text-lg font-semibold text-foreground">What happens next</h3>
              <div className="space-y-4 text-sm">
                {[
                  "Miss is saved with event and topic tags",
                  "Question returns in short interval review",
                  "If missed again, interval tightens",
                  "If solved twice, interval expands",
                ].map((line, idx) => (
                  <div key={line} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{idx + 1}</span>
                    <span className="text-muted-foreground">{line}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] fade-in-section">
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-7">
              <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">Mistake Tracking System</h2>
              <p className="mb-5 text-muted-foreground">Missed questions are never wasted. They are converted into targeted training tasks.</p>
              <div className="space-y-4">
                {[
                  { title: "Stored automatically", text: "Every incorrect response is saved by event and topic." },
                  { title: "Retested over time", text: "Items return at intervals that adapt to your stability." },
                  { title: "Weak topics surfaced", text: "Analytics highlight recurring misses before competition day." },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-7">
              <h4 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Weak topic map</h4>
              <div className="space-y-4">
                {[
                  { topic: "Prefixes and suffixes", misses: 12 },
                  { topic: "Pharm categories", misses: 9 },
                  { topic: "Anatomical planes", misses: 7 },
                  { topic: "Pathway sequencing", misses: 6 },
                ].map((item) => (
                  <div key={item.topic}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-foreground">{item.topic}</span>
                      <span className="font-semibold text-primary">{item.misses} misses</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted/80">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${item.misses * 6}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Built for HOSA depth</h2>
          <p className="mx-auto max-w-3xl text-muted-foreground">StudyRx has 1800 plus questions total, aligned to official guidelines and references, created with input from SLC finalists and ILC competitors.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 fade-in-section">
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-6 text-center">
              <Target className="mx-auto mb-4 h-6 w-6 text-primary" />
              <p className="mb-1 text-3xl font-bold text-foreground">1800+</p>
              <p className="text-sm text-muted-foreground">Total competition style questions</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-6 text-center">
              <Check className="mx-auto mb-4 h-6 w-6 text-primary" />
              <p className="mb-1 text-3xl font-bold text-foreground">Guideline aligned</p>
              <p className="text-sm text-muted-foreground">Built from official references</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-6 text-center">
              <Users className="mx-auto mb-4 h-6 w-6 text-primary" />
              <p className="mb-1 text-3xl font-bold text-foreground">Expert authored</p>
              <p className="text-sm text-muted-foreground">SLC finalists and ILC competitors</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Event explorer</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">A stacked view that keeps context visible while you move through events.</p>
        </div>

        <div className="relative mx-auto h-[360px] max-w-4xl fade-in-section">
          {stackedEvents.map((event, idx) => {
            const IconComponent = event.icon;
            const isCenter = idx === 1;
            const position = idx === 0 ? "-left-4 top-10 -rotate-6 scale-95" : idx === 2 ? "-right-4 top-10 rotate-6 scale-95" : "left-1/2 top-2 -translate-x-1/2";
            return (
              <div
                key={`${event.id}-${idx}`}
                className={`absolute w-full max-w-3xl transition-all duration-500 ${position} ${isCenter ? "z-20 opacity-100" : "z-10 opacity-70"}`}
              >
                <Card className={`border-primary/20 bg-card/85 ${isCenter ? "shadow-xl" : "shadow-none"}`}>
                  <CardContent className="p-7">
                    <div className="flex items-center gap-5">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/15">
                        <IconComponent className="h-8 w-8 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 truncate text-xl font-bold text-foreground">{event.name}</h3>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      {isCenter && (
                        <Button asChild>
                          <Link href={`/practice/${event.id}`}>
                            Open
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-3">
            <button onClick={() => setActiveEvent((prev) => (prev - 1 + HOSA_EVENTS.length) % HOSA_EVENTS.length)} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setActiveEvent((prev) => (prev + 1) % HOSA_EVENTS.length)} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Student voices</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">Feedback from early users after moving from passive review stacks.</p>
        </div>

        <div className="mx-auto max-w-3xl fade-in-section">
          <Card className="border-primary/20 bg-card/85">
            <CardContent className="p-8 text-center">
              <Quote className="mx-auto mb-4 h-7 w-7 text-primary" />
              <p className="mb-6 text-base text-foreground md:text-lg">“{currentTestimonial.quote}”</p>
              <p className="font-semibold text-foreground">{currentTestimonial.name}</p>
              <p className="text-sm text-primary">{currentTestimonial.event} · {currentTestimonial.result}</p>
            </CardContent>
          </Card>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button onClick={() => setActiveTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/70">
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="flex gap-2">
              {TESTIMONIALS.map((_, idx) => (
                <button key={idx} onClick={() => setActiveTestimonial(idx)} className={`h-2 rounded-full transition-all ${idx === activeTestimonial ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"}`} />
              ))}
            </div>
            <button onClick={() => setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/70">
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-4xl text-center fade-in-section">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">Ready to prep like a finalist?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-base md:text-lg text-muted-foreground">
            StudyRx combines structure, correction loops, and measurable progress so you can train intentionally from first practice to ILC.
          </p>
          <Button asChild size="lg" className="px-10">
            <Link href="/dashboard">
              Begin Your Journey
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="container pt-4">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/40 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="StudyRx" width={24} height={24} className="h-6 w-6" />
            <span className="font-semibold text-foreground">StudyRx</span>
          </div>
          <div className="flex items-center gap-3">
            <span>© 2026 StudyRx</span>
            <Link href="/contributors" className="font-semibold text-primary hover:underline">Contributors</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
