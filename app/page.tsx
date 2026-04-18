"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BarChart3, Brain, Check, ChevronLeft, ChevronRight, Clock, RefreshCw, Sparkles, Target, TrendingUp, TriangleAlert, Users } from "lucide-react";
import { HOSA_EVENTS_DISPLAY_ORDER as HOSA_EVENTS } from "@/lib/events";

const METRICS = [
  { label: "Accuracy lift", value: "+17%", hint: "2-week average", icon: TrendingUp },
  { label: "Avg. response", value: "31s", hint: "target pace", icon: Clock },
  { label: "Review completion", value: "94%", hint: "with correction loop", icon: RefreshCw },
  { label: "Consistency", value: "4.6x", hint: "faster retention", icon: Brain },
];

const COMPARISON_ROWS = [
  {
    category: "Learning style",
    studyrx: "Active recall with timing pressure",
    alternatives: "Mostly passive rereading",
  },
  {
    category: "Error handling",
    studyrx: "Every miss becomes a tracked correction task",
    alternatives: "Wrong answers disappear after you move on",
  },
  {
    category: "Content relevance",
    studyrx: "Event-specific + competition-style",
    alternatives: "Mixed quality and often off-target",
  },
  {
    category: "Progress clarity",
    studyrx: "Per-event accuracy + weak-topic surfacing",
    alternatives: "No clear map of what to fix next",
  },
];

const TESTIMONIALS = [
  {
    quote: "I stopped guessing what to study. The weak-topic queue basically built my schedule for me.",
    name: "Ari K.",
    event: "Medical Terminology",
    result: "Top 5 at SLC",
  },
  {
    quote: "The redemption loop was huge. Questions I missed came back at the right time until they finally stuck.",
    name: "Maya R.",
    event: "Pathophysiology",
    result: "ILC qualifier",
  },
  {
    quote: "Feels like training, not cramming. The analytics made our chapter prep way more intentional.",
    name: "Jordan T.",
    event: "Behavioral Health",
    result: "2nd at Regionals",
  },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = HOSA_EVENTS.length;

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

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-16">
      <section className="relative overflow-hidden pt-20 md:pt-24 lg:pt-28">
        <div className="absolute inset-0 -z-20 bg-background" />
        <div className="absolute inset-0 -z-10 animate-wave-grid bg-[linear-gradient(to_right,color-mix(in_oklab,var(--primary)_23%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--primary)_18%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-80" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,color-mix(in_oklab,var(--primary)_22%,transparent)_0%,transparent_40%),radial-gradient(circle_at_84%_20%,color-mix(in_oklab,var(--accent)_18%,transparent)_0%,transparent_42%),linear-gradient(to_bottom,transparent_62%,color-mix(in_oklab,var(--background)_96%,white)_100%)]" />

        <div className="container relative pb-16 md:pb-20">
          <div className="absolute right-0 top-4 z-20 flex gap-3 md:top-6">
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
              Train with purpose.
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-[shimmer_3.6s_ease-in-out_infinite]">
                Compete with confidence.
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-3xl text-base text-muted-foreground md:text-lg">
              StudyRx gives HOSA students structured practice, targeted correction, and progression signals so every session improves real competition outcomes.
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
                  <div key={item.label} className="glass-card fade-in-section rounded-2xl border-border/50 px-4 py-4 text-left" style={{ transitionDelay: `${idx * 80}ms` }}>
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
          <p className="mx-auto max-w-2xl text-muted-foreground">If your prep stack is Quizlet + PDFs + textbook highlights, you’re working hard—but not always strategically.</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/80 fade-in-section">
          <table className="w-full text-left text-sm md:text-base">
            <thead className="bg-primary/8 text-foreground">
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 font-semibold">Dimension</th>
                <th className="px-4 py-3 font-semibold text-primary">StudyRx</th>
                <th className="px-4 py-3 font-semibold">Quizlet / PDFs / Textbooks</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.category} className="border-b border-border/30 last:border-none">
                  <td className="px-4 py-3 font-medium text-foreground">{row.category}</td>
                  <td className="px-4 py-3 text-primary">{row.studyrx}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.alternatives}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Inside a real practice session</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">Not abstract “architecture”—here’s exactly what a rep looks like from first question to correction loop.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 fade-in-section">
          <Card className="border-primary/20 bg-card/80 lg:col-span-2">
            <CardContent className="p-6">
              <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Sample prompt · Medical Terminology</p>
              <p className="mb-4 text-lg font-semibold text-foreground">Which term means “abnormal softening of bone?”</p>
              <div className="grid gap-2 md:grid-cols-2">
                {["Osteitis", "Osteomalacia", "Osteoma", "Osteotomy"].map((option, idx) => (
                  <div key={option} className={`rounded-xl border px-3 py-2 text-sm ${idx === 1 ? "border-primary/35 bg-primary/10 text-foreground" : "border-border/50 bg-background/60 text-muted-foreground"}`}>
                    {String.fromCharCode(65 + idx)}. {option}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                You chose <span className="font-semibold text-foreground">A</span>. Correct answer: <span className="font-semibold text-primary">B (Osteomalacia)</span>. Explanation is shown instantly and the question is stored for scheduled re-test.
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">What happens next</h3>
              <div className="space-y-3 text-sm">
                {[
                  "Missed question is saved to your mistake queue.",
                  "It returns in short interval review.",
                  "If missed again, interval tightens.",
                  "If solved twice, interval expands.",
                ].map((line, idx) => (
                  <div key={line} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2">
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
              <p className="mb-5 text-muted-foreground">This is the core engine: misses are not forgotten—they are transformed into targeted review tasks.</p>
              <div className="space-y-4">
                {[
                  { title: "Mistakes are stored", text: "Every incorrect response is tagged by event + topic and queued automatically." },
                  { title: "Re-tested at intervals", text: "Re-appears sooner when unstable, later when mastery improves." },
                  { title: "Weak topics surface", text: "Topic dashboards expose recurring misses before competition day." },
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
              <h4 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Weak-topic surfacing</h4>
              <div className="space-y-4">
                {[
                  { topic: "Prefixes & suffixes", misses: 12 },
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
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Built for HOSA events, not generic prep</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">Depth matters. Every event module is structured around real competition expectations.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 fade-in-section">
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-6 text-center">
              <BarChart3 className="mx-auto mb-4 h-6 w-6 text-primary" />
              <p className="mb-1 text-3xl font-bold text-foreground">250+</p>
              <p className="text-sm text-muted-foreground">questions per major event set</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-6 text-center">
              <Check className="mx-auto mb-4 h-6 w-6 text-primary" />
              <p className="mb-1 text-3xl font-bold text-foreground">Guideline-aligned</p>
              <p className="text-sm text-muted-foreground">mapped to official event expectations</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-card/80">
            <CardContent className="p-6 text-center">
              <TriangleAlert className="mx-auto mb-4 h-6 w-6 text-primary" />
              <p className="mb-1 text-3xl font-bold text-foreground">3 tiers</p>
              <p className="text-sm text-muted-foreground">Regionals → SLC → ILC progression</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Train by real events</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">Each event has its own pacing and structure. Your practice should match that reality.</p>
        </div>

        <div className="relative mx-auto max-w-4xl fade-in-section">
          <div className="overflow-hidden rounded-2xl">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {HOSA_EVENTS.map((event) => {
                const IconComponent = event.icon;
                return (
                  <div key={event.id} className="min-w-full px-2">
                    <Card className="border-primary/20 bg-card/80">
                      <CardContent className="p-8">
                        <div className="flex flex-col items-center gap-6 md:flex-row">
                          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/15">
                            <IconComponent className="h-10 w-10 text-primary" />
                          </div>
                          <div className="flex-1 text-center md:text-left">
                            <h3 className="mb-2 text-2xl font-bold text-foreground">{event.name}</h3>
                            <p className="mb-6 text-muted-foreground">{event.description}</p>
                            <Button asChild>
                              <Link href={`/practice/${event.id}`}>
                                Practice Now
                                <ChevronRight className="ml-2 h-5 w-5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))} className="absolute left-0 top-1/2 -translate-x-6 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground" disabled={currentSlide === 0}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1))} className="absolute right-0 top-1/2 translate-x-6 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground" disabled={currentSlide === totalSlides - 1}>
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-8 flex justify-center gap-2">
            {HOSA_EVENTS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${index === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Early social proof</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">What beta users said after switching from passive review workflows.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 fade-in-section">
          {TESTIMONIALS.map((item) => (
            <Card key={item.name} className="border-primary/20 bg-card/80">
              <CardContent className="p-6">
                <p className="mb-4 text-sm text-muted-foreground">“{item.quote}”</p>
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-primary">{item.event} · {item.result}</p>
              </CardContent>
            </Card>
          ))}
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
