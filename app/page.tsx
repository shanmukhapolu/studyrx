"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, Clock, BarChart3, ChevronRight, ChevronLeft, ArrowRight, Brain, RefreshCw, X, Check } from "lucide-react";
import { HOSA_EVENTS_DISPLAY_ORDER as HOSA_EVENTS } from "@/lib/events";

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = HOSA_EVENTS.length;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".fade-in-section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background pb-16">
      <div className="fixed inset-0 -z-20 bg-background" />
      <div className="fixed inset-0 -z-10 animate-wave-grid bg-[linear-gradient(to_right,color-mix(in_oklab,var(--primary)_18%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--primary)_14%,transparent)_1px,transparent_1px)] bg-[size:36px_36px] opacity-65" />
      <div className="pointer-events-none fixed -z-10 inset-0 bg-[radial-gradient(circle_at_8%_12%,color-mix(in_oklab,var(--primary)_18%,transparent)_0%,transparent_40%),radial-gradient(circle_at_88%_16%,color-mix(in_oklab,var(--accent)_18%,transparent)_0%,transparent_40%),radial-gradient(circle_at_52%_74%,color-mix(in_oklab,var(--primary)_14%,transparent)_0%,transparent_48%)]" />

      <section className="container relative pt-20 md:pt-24 lg:pt-28">
        <div className="absolute top-0 right-0 z-20 flex gap-3">
          <Button asChild variant="outline" className="bg-background/75 backdrop-blur-xl">
            <Link href="/auth/signin">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>

        <div className="mx-auto max-w-5xl text-center fade-in-section">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/70 px-6 py-2 backdrop-blur-xl">
            <Image src="/logo.png" alt="StudyRx Logo" width={28} height={28} className="h-7 w-7" />
            <span className="text-sm font-semibold text-foreground">StudyRx · Competitive Event Prep</span>
          </div>

          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Practice that actually feels
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-[shimmer_3.6s_ease-in-out_infinite]">
              like game-day training.
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-3xl text-base text-muted-foreground md:text-lg">
            StudyRx turns random cramming into smart reps: event-specific drills, instant feedback, and momentum you can literally see improving.
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="min-w-44">
              <Link href="/auth/signup">
                Start a Session
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-w-44">
              <Link href="/events">Explore Events</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Current user avg", value: "+17%", sub: "accuracy jump in 2 weeks", icon: TrendingUp },
              { label: "Focus pace", value: "31s", sub: "per question target timing", icon: Clock },
              { label: "Session quality", value: "94%", sub: "students completing review", icon: BarChart3 },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="glass-card fade-in-section rounded-2xl border-border/50 px-4 py-4 text-left" style={{ transitionDelay: `${idx * 90}ms` }}>
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container py-14 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 fade-in-section">
          <Card className="border-primary/20 bg-card/75">
            <CardContent className="p-6">
              <h3 className="mb-5 flex items-center gap-3 text-xl font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><X className="h-4 w-4 text-primary" /></span>
                The old prep loop
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 rounded-full bg-primary" />Random decks, random confidence.</li>
                <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 rounded-full bg-primary" />No clue what to fix next.</li>
                <li className="flex items-start gap-3"><span className="mt-2 h-2 w-2 rounded-full bg-primary" />Competition day feels like a coin flip.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/25 bg-gradient-to-br from-primary/10 to-accent/10">
            <CardContent className="p-6">
              <h3 className="mb-5 flex items-center gap-3 text-xl font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>
                The StudyRx loop
              </h3>
              <p className="mb-5 text-muted-foreground">You train by event, spot weak zones fast, and stack confidence one focused session at a time.</p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">Event-first practice</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">Live weak-area signals</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">Repeat-until-mastered flow</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-14 md:py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Why students lock in with StudyRx</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">Clean UI, clear goals, and enough data to make every session count.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 fade-in-section">
          {[
            { icon: Target, title: "Built by event", text: "No generic fluff. Every rep maps to real HOSA formats." },
            { icon: RefreshCw, title: "Built for retention", text: "Missed items return intelligently so gaps don’t survive." },
            { icon: Brain, title: "Built for focus", text: "Minimal distractions, maximum clarity." },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-primary/20 bg-card/75" style={{ transitionDelay: `${idx * 100}ms` }}>
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="container py-14 md:py-16">
        <div className="mb-10 text-center fade-in-section">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Train by real events</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">Scroll through events and jump straight into focused reps.</p>
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

      <section className="container py-14 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 fade-in-section">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Your progress, visualized fast</h2>
            <p className="mb-6 text-muted-foreground">Accuracy, pace, and trend signals in one glance so you know exactly where your next session should hit.</p>
            <ul className="space-y-4">
              {[
                { icon: Target, title: "Accuracy by event", text: "See where you’re sharp vs where you’re guessing." },
                { icon: Clock, title: "Time per question", text: "Find your speed sweet spot without rushing." },
                { icon: TrendingUp, title: "Trend lines", text: "Track if your prep is actually moving the needle." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-4 w-4 text-primary" /></span>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <Card className="border-primary/20 bg-card/85">
            <CardContent className="p-7">
              <h4 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Live dashboard sample</h4>
              <div className="space-y-4">
                {[
                  { name: "Medical Terminology", score: 92 },
                  { name: "Pharmacology", score: 85 },
                  { name: "Nutrition", score: 78 },
                  { name: "Behavioral Health", score: 81 },
                ].map((item) => (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <span className="text-sm font-semibold text-primary">{item.score}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-4xl text-center fade-in-section">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">Ready to walk into comp calm, fast, and prepared?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-base md:text-lg text-muted-foreground">You bring the ambition. StudyRx brings the structure. That combo is unfair (in the best way).</p>
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
