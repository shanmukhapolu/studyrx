"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, Clock, BarChart3, Zap, ChevronRight, ChevronLeft, ArrowRight, BarChart, Brain, RefreshCw, Users, Trophy, Sparkles, X, Check, PawPrint, Rabbit, Fish } from "lucide-react";
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
      { threshold: 0.1 }
    );

    document.querySelectorAll(".fade-in-section").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Grid Background Pattern */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute top-6 right-6 z-20 flex gap-3">
          <Button asChild variant="outline" className="bg-background/65 backdrop-blur-xl">
            <Link href="/auth/signin">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,color-mix(in_oklab,var(--primary)_32%,transparent)_0%,transparent_34%),radial-gradient(circle_at_78%_20%,color-mix(in_oklab,var(--accent)_26%,transparent)_0%,transparent_34%),linear-gradient(130deg,color-mix(in_oklab,var(--background)_84%,white)_0%,color-mix(in_oklab,var(--background)_94%,black)_100%)]" />
        <div className="absolute inset-0 animate-wave-grid bg-[linear-gradient(to_right,color-mix(in_oklab,var(--primary)_8%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--accent)_10%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] opacity-50" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container relative py-20 md:py-24 lg:py-28">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 backdrop-blur-xl px-6 py-2 text-sm font-medium animate-fade-in-up">
              <Image 
                src="/logo.png" 
                alt="StudyRx Logo" 
                width={30} 
                height={30}
                className="h-[30px] w-[30px]"
              />
              <span className="text-foreground font-semibold text-lg">StudyRx</span>
            </div>
            
            <h1 className="mb-8 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl text-balance animate-fade-in-up animation-delay-100">
              Master HOSA with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">
                Confidence
              </span>
            </h1>
            
            <p className="mx-auto mb-8 max-w-2xl text-base md:text-lg text-muted-foreground animate-fade-in-up animation-delay-200">
              Precision-focused practice for HOSA competitive events. Train smarter, compete stronger.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up animation-delay-300">
              <Button asChild size="lg" className="min-w-44">
                <Link href="/auth/signup">
                  Start Practicing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-w-44"
              >
                <Link href="/events">
                  Browse Events
                </Link>
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 fade-in-section">
              {[
                { label: "Adaptive accuracy", value: "94%", icon: BarChart3 },
                { label: "Avg response time", value: "31s", icon: Clock },
                { label: "Weekly momentum", value: "+18%", icon: TrendingUp },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="glass-card rounded-2xl border-border/40 px-4 py-4 text-left">
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section className="border-b border-border/50">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12 fade-in-section">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                HOSA Isn't About Memorizing —<br />It's About <span className="text-primary">Precision</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start fade-in-section">
              {/* Problem Side */}
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />
                <Card className="relative border border-primary/20 bg-card/90 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <X className="h-6 w-6 text-primary" />
                      </div>
                      Most students:
                    </h3>
                    <ul className="space-y-4 text-base">
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <span>Study random Quizlets</span>
                      </li>
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <span>Don't know which topics they're weak in</span>
                      </li>
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <span>Walk into competition hoping they studied the right stuff</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Solution Side */}
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />
                <Card className="relative border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/12 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary-foreground" />
                      </div>
                      StudyRx fixes that.
                    </h3>
                    <p className="text-base text-foreground leading-relaxed mb-6">
                      We organize practice by HOSA event, track your performance, and help you focus where it actually matters.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                        Organized Practice
                      </div>
                      <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                        Performance Tracking
                      </div>
                      <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                        Focused Learning
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How StudyRx Is Different */}
      <section className="border-b border-border/50 bg-muted/30">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 fade-in-section">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-4">
                <Sparkles className="h-4 w-4" />
                Differentiation
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Why StudyRx Works
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                StudyRx isn't built like a typical study site.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 fade-in-section mb-12">
              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Event Organization</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Questions are grouped by competitive event, not random topics
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
                    <BarChart className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Real Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Practice sessions generate performance data, not just scores
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm transition-colors duration-200">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Smart Review</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Missed questions feed directly into future review
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center fade-in-section">
              <p className="text-base text-foreground font-medium italic border-l-4 border-primary pl-4 inline-block">
                Every part of the platform is designed to push improvement forward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Credibility */}
      <section className="border-b border-border/50">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-4xl fade-in-section">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/12 rounded-3xl blur-2xl" />
              <Card className="relative border border-primary/20 bg-card/90 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      Built by Students Who Understand HOSA
                    </h2>
                  </div>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6">
                  Designed specifically for competitive event prep — not generic exam practice.
                </p>
                <Link
                  href="/contributors"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  View the amazing contributors who contributed questions to this platform.
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="border-b border-border/50 bg-muted/30">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 fade-in-section">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-4">
                <Users className="h-4 w-4" />
                Audience
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Who StudyRx Is For
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 fade-in-section mb-12">
              <Card className="border border-primary/20 bg-card/80 backdrop-blur-sm hover:border-primary/35 transition-colors duration-200 group">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 transition-transform">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">HOSA Members</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Preparing for competitive events
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-primary/20 bg-card/80 backdrop-blur-sm hover:border-primary/35 transition-colors duration-200 group">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 transition-transform">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Structured Learners</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Students who want structure, not chaos
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-primary/20 bg-card/80 backdrop-blur-sm hover:border-primary/35 transition-colors duration-200 group">
                <CardContent className="p-6 text-center">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 transition-transform">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Confident Competitors</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Aiming to walk in confident, not uncertain
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center fade-in-section">
              <p className="text-xl text-foreground font-semibold">
                If you care about performance, this was built for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section with Slider */}
      <section className="border-b border-border/50">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 fade-in-section">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Train for Real HOSA Competitive Events
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Focused practice built around actual HOSA event content — no fluff, no guesswork.
              </p>
            </div>

            {/* Event Slider */}
            <div className="relative fade-in-section max-w-4xl mx-auto">
              <div className="mb-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <div className="float-mascot flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-2"><Rabbit className="h-4 w-4 text-primary" /> quick thinking</div>
                <div className="float-mascot [animation-delay:1.4s] flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-2"><Fish className="h-4 w-4 text-primary" /> smooth pacing</div>
                <div className="float-mascot [animation-delay:2.4s] hidden md:flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-2"><PawPrint className="h-4 w-4 text-primary" /> consistent reps</div>
              </div>
              <div className="overflow-hidden rounded-2xl">
                <div 
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {HOSA_EVENTS.map((event) => {
                    const IconComponent = event.icon;
                    return (
                      <div key={event.id} className="min-w-full px-2">
                        <Card className="border border-primary/20 bg-gradient-to-br from-card/90 to-muted/50 backdrop-blur-sm shadow-none">
                          <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                              <div className="flex-shrink-0 h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/12 flex items-center justify-center">
                                <IconComponent className="h-10 w-10 text-primary" />
                              </div>
                              <div className="flex-1 text-center md:text-left">
                                <h3 className="mb-2 text-2xl font-bold text-foreground">
                                  {event.name}
                                </h3>
                                <p className="mb-6 text-base text-muted-foreground leading-relaxed">
                                  {event.description}
                                </p>
                                <Button asChild className="shadow-none">
                                  <Link href={`/practice/${event.id}`}>
                                    Practice Now
                                    <ChevronRight className="ml-2 h-6 w-6" />
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

              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 md:-translate-x-16 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-[0_18px_32px_-24px_color-mix(in_oklab,var(--primary)_95%,transparent)] transition-colors hover:bg-primary/90 flex items-center justify-center disabled:opacity-50"
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 md:translate-x-16 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-[0_18px_32px_-24px_color-mix(in_oklab,var(--primary)_95%,transparent)] transition-colors hover:bg-primary/90 flex items-center justify-center disabled:opacity-50"
                disabled={currentSlide === totalSlides - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              {/* Slide Indicators */}
              <div className="flex justify-center gap-2 mt-8">
                {HOSA_EVENTS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentSlide
                        ? "w-8 bg-primary"
                        : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-9 text-center fade-in-section">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="hover:bg-primary/5"
              >
                <Link href="/events">
                  View All Events
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border/50 bg-muted/30">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 fade-in-section">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Study Smarter. Compete Stronger.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 fade-in-section">
              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm hover:shadow-none transition-all group">
                <CardContent className="p-7">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 transition-transform">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Event-Specific Practice</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Practice questions designed specifically for each HOSA event — no generic studying.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm hover:shadow-none transition-all group">
                <CardContent className="p-7">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 transition-transform">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Advanced Performance Analytics</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    See accuracy, timing, and trends so you know exactly what to fix.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm hover:shadow-none transition-all group">
                <CardContent className="p-7">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 transition-transform">
                    <RefreshCw className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Redemption System</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Miss a question? You'll see it again — and track your improvement over time.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm hover:shadow-none transition-all group">
                <CardContent className="p-7">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 transition-transform">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Progress Tracking</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    Visual dashboards that show how far you've come across sessions and events.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Data & Feedback Section */}
      <section className="border-b border-border/50">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8 items-center fade-in-section">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
                  <BarChart className="h-4 w-4" />
                  Performance Metrics
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                  Data-Driven Improvement
                </h2>
                <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                  After every session, StudyRx records:
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-base mb-1">Accuracy by event</div>
                      <div className="text-muted-foreground">See your precision across competitions</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-base mb-1">Time per question</div>
                      <div className="text-muted-foreground">Optimize speed without sacrificing accuracy</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-base mb-1">Performance trends over time</div>
                      <div className="text-muted-foreground">Visualize your growth journey</div>
                    </div>
                  </li>
                </ul>
                <p className="mt-8 text-base text-foreground font-semibold border-l-4 border-primary pl-4">
                  You don't just study — you measure progress.
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
                <Card className="relative border border-primary/20 bg-card/90 backdrop-blur-sm shadow-none">
                  <CardContent className="p-7">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-6">Live Performance Dashboard</h4>
                    <div className="space-y-4">
                      {[
                        { name: "Medical Terminology", score: 92, color: "from-primary to-accent" },
                        { name: "Pharmacology", score: 85, color: "from-primary to-accent" },
                        { name: "Nutrition", score: 78, color: "from-primary to-accent" },
                        { name: "Dental Terminology", score: 88, color: "from-primary to-accent" },
                        { name: "Behavioral Health", score: 81, color: "from-primary to-accent" },
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-foreground">{item.name}</span>
                            <span className="text-sm font-bold text-primary">{item.score}%</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${item.color} transition-all duration-1000`}
                              style={{ width: `${item.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Flow Section */}
      <section className="border-b border-border/50 bg-muted/30">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-16 fade-in-section">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                How Practice Sessions Work
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                No guessing what to study next — the system guides you.
              </p>
            </div>

            <div className="relative fade-in-section">
              <div className="space-y-8">
                {[
                  {
                    num: 1,
                    title: "Choose a competitive event",
                    desc: "Select from Medical Terminology, Pharmacology, Nutrition, and more",
                    color: "primary"
                  },
                  {
                    num: 2,
                    title: "Complete a focused practice session",
                    desc: "Answer event-specific questions with real-time feedback",
                    color: "primary"
                  },
                  {
                    num: 3,
                    title: "Review accuracy, timing, and weak areas",
                    desc: "Detailed analytics show exactly where to improve",
                    color: "primary"
                  },
                  {
                    num: 4,
                    title: "Revisit missed questions automatically",
                    desc: "Our redemption system ensures you master every topic",
                    color: "primary"
                  },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className="fade-in-section practice-step grid grid-cols-[56px_1fr] items-start gap-4 rounded-xl border border-border/60 bg-card/70 px-4 py-4 shadow-none md:grid-cols-[72px_1fr]"
                    style={{ transitionDelay: `${idx * 120}ms` }}
                  >
                    <div className="flex items-start justify-center pt-1">
                      <div className={`h-10 w-10 rounded-full bg-${step.color}/15 text-foreground flex items-center justify-center font-semibold text-base`}>
                        {step.num}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-base">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-b border-border/50">
        <div className="container py-12 md:py-16">
          <div className="mx-auto max-w-5xl fade-in-section">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-accent/20 rounded-3xl blur-2xl" />
              <Card className="relative border border-primary/30 bg-gradient-to-br from-card/90 to-muted/50 backdrop-blur-sm shadow-none">
                <CardContent className="p-10 md:p-12 text-center">
                  <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
                    Ready to Compete With <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Confidence</span>?
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
                    Stop guessing. Start training with purpose.
                  </p>
                  <Button asChild size="lg" className="h-12 px-8 text-base transition-colors duration-200">
                    <Link href="/dashboard">
                      Begin Your Journey
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/40 border-t border-border/50">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="StudyRx Logo" 
                width={32} 
                height={32}
                className="h-6 w-6"
              />
              <span className="text-base font-bold text-foreground">StudyRx</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>© 2026 StudyRx. Built for HOSA competitors.</span>
              <Link href="/contributors" className="font-semibold text-primary hover:underline">
                Contributors
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
