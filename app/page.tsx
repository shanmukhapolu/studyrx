"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, Clock, BarChart3, Zap, ChevronRight, ChevronLeft, ArrowRight, BarChart, Brain, RefreshCw, Users, Trophy, Sparkles, X, Check } from "lucide-react";
import { HOSA_EVENTS } from "@/lib/events";

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
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute top-6 right-6 z-20 flex gap-3">
          <Button asChild variant="outline" className="border-primary/30 bg-background/80 backdrop-blur-sm">
            <Link href="/auth/signin">Log In</Link>
          </Button>
          <Button asChild className="shadow-none">
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent" />
        <div className="container relative mx-auto px-6 py-24 md:py-32 lg:py-40">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm px-8 py-4 text-base font-medium shadow-lg animate-fade-in-up">
              <Image 
                src="/logo.png" 
                alt="StudyRx Logo" 
                width={30} 
                height={30}
                className="h-[30px] w-[30px]"
              />
              <span className="text-foreground font-semibold text-xl">StudyRx</span>
            </div>
            
            <h1 className="mb-8 text-6xl font-bold tracking-tight text-foreground md:text-8xl text-balance animate-fade-in-up animation-delay-100 leading-tight">
              Master HOSA with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">
                Confidence
              </span>
            </h1>
            
            <p className="mx-auto mb-12 max-w-2xl text-xl text-muted-foreground animate-fade-in-up animation-delay-200 leading-relaxed">
              Precision-focused practice for HOSA competitive events. Train smarter, compete stronger.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up animation-delay-300">
              <Button asChild size="lg" className="h-14 px-8 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <Link href="/auth/signup">
                  Start Practicing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 px-8 text-lg border-2 text-foreground hover:text-foreground hover:bg-primary/5"
              >
                <Link href="/events">
                  Browse Events
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section className="border-b border-border/50">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12 fade-in-section">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                HOSA Isn't About Memorizing —<br />It's About <span className="text-primary">Precision</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-10 items-start fade-in-section">
              {/* Problem Side */}
              <div className="relative">
                <div className="absolute -inset-4 bg-destructive/5 rounded-3xl blur-2xl" />
                <Card className="relative border-2 border-destructive/20 bg-card/90 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <X className="h-6 w-6 text-destructive" />
                      </div>
                      Most students:
                    </h3>
                    <ul className="space-y-4 text-lg">
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <div className="mt-1 h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                        </div>
                        <span>Study random Quizlets</span>
                      </li>
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <div className="mt-1 h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
                        </div>
                        <span>Don't know which topics they're weak in</span>
                      </li>
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <div className="mt-1 h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-destructive" />
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
                <Card className="relative border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary-foreground" />
                      </div>
                      StudyRx fixes that.
                    </h3>
                    <p className="text-lg text-foreground leading-relaxed mb-6">
                      We organize practice by HOSA event, track your performance, and help you focus where it actually matters.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                        Organized Practice
                      </div>
                      <div className="px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium text-accent">
                        Performance Tracking
                      </div>
                      <div className="px-4 py-2 rounded-full bg-chart-3/10 border border-chart-3/20 text-sm font-medium text-chart-3">
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
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 fade-in-section">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-4">
                <Sparkles className="h-4 w-4" />
                Differentiation
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Why StudyRx Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                StudyRx isn't built like a typical study site.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 fade-in-section mb-12">
              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all hover:-translate-y-2 duration-300">
                <CardContent className="p-8 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Event Organization</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Questions are grouped by competitive event, not random topics
                  </p>
                </CardContent>
              </Card>

              <Card className="border-accent/20 bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all hover:-translate-y-2 duration-300">
                <CardContent className="p-8 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mx-auto mb-6">
                    <BarChart className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Real Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Practice sessions generate performance data, not just scores
                  </p>
                </CardContent>
              </Card>

              <Card className="border-chart-3/20 bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all hover:-translate-y-2 duration-300">
                <CardContent className="p-8 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-chart-3/20 to-chart-3/5 flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="h-8 w-8 text-chart-3" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Smart Review</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Missed questions feed directly into future review
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center fade-in-section">
              <p className="text-lg text-foreground font-medium italic border-l-4 border-primary pl-4 inline-block">
                Every part of the platform is designed to push improvement forward.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Credibility */}
      <section className="border-b border-border/50">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-4xl fade-in-section">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-3xl" />
              <Card className="relative border-2 border-primary/20 bg-card/90 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <div className="inline-flex items-center justify-center gap-3 mb-6">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                      Built by Students Who Understand HOSA
                    </h2>
                  </div>
                  <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                    Designed specifically for competitive event prep — not generic exam practice.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 fade-in-section">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-semibold mb-4">
                <Users className="h-4 w-4" />
                Audience
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Who StudyRx Is For
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 fade-in-section mb-12">
              <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-105 duration-300 group">
                <CardContent className="p-8 text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Brain className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">HOSA Members</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Preparing for competitive events
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-accent/20 bg-card/80 backdrop-blur-sm hover:border-accent/40 transition-all hover:scale-105 duration-300 group">
                <CardContent className="p-8 text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Target className="h-10 w-10 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Structured Learners</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Students who want structure, not chaos
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-chart-3/20 bg-card/80 backdrop-blur-sm hover:border-chart-3/40 transition-all hover:scale-105 duration-300 group">
                <CardContent className="p-8 text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-chart-3/20 to-chart-3/5 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="h-10 w-10 text-chart-3" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Confident Competitors</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Aiming to walk in confident, not uncertain
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center fade-in-section">
              <p className="text-2xl text-foreground font-bold">
                If you care about performance, this was built for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section with Slider */}
      <section className="border-b border-border/50">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 fade-in-section">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Train for Real HOSA Competitive Events
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Focused practice built around actual HOSA event content — no fluff, no guesswork.
              </p>
            </div>

            {/* Event Slider */}
            <div className="relative fade-in-section max-w-4xl mx-auto">
              <div className="overflow-hidden rounded-2xl">
                <div 
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {HOSA_EVENTS.map((event) => {
                    const IconComponent = event.icon;
                    return (
                      <div key={event.id} className="min-w-full px-2">
                        <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/90 to-muted/50 backdrop-blur-sm shadow-none">
                          <CardContent className="p-12">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                              <div className="flex-shrink-0 h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                                <IconComponent className="h-12 w-12 text-primary" />
                              </div>
                              <div className="flex-1 text-center md:text-left">
                                <h3 className="mb-3 text-3xl font-bold text-foreground">
                                  {event.name}
                                </h3>
                                <p className="mb-6 text-lg text-muted-foreground leading-relaxed">
                                  {event.description}
                                </p>
                                <Button asChild size="lg" className="shadow-lg">
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

              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 md:-translate-x-16 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-110 transition-all flex items-center justify-center disabled:opacity-50"
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 md:translate-x-16 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-110 transition-all flex items-center justify-center disabled:opacity-50"
                disabled={currentSlide === totalSlides - 1}
              >
                <ChevronRight className="h-7 w-7" />
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

            <div className="mt-12 text-center fade-in-section">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 hover:bg-primary/5"
              >
                <Link href="/events">
                  View All Events
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-16 fade-in-section">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Study Smarter. Compete Stronger.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 fade-in-section">
              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-10">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Event-Specific Practice</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Practice questions designed specifically for each HOSA event — no generic studying.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-accent/20 bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-10">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Advanced Performance Analytics</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    See accuracy, timing, and trends so you know exactly what to fix.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-chart-3/20 bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-10">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-chart-3/20 to-chart-3/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <RefreshCw className="h-8 w-8 text-chart-3" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Redemption System</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Miss a question? You'll see it again — and track your improvement over time.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-chart-4/20 bg-card/80 backdrop-blur-sm hover:shadow-2xl transition-all group">
                <CardContent className="p-10">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-chart-4/20 to-chart-4/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-8 w-8 text-chart-4" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Progress Tracking</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
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
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-16 items-center fade-in-section">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
                  <BarChart className="h-4 w-4" />
                  Performance Metrics
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                  Data-Driven Improvement
                </h2>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  After every session, StudyRx records:
                </p>
                <ul className="space-y-5">
                  <li className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-lg mb-1">Accuracy by event</div>
                      <div className="text-muted-foreground">See your precision across competitions</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-lg mb-1">Time per question</div>
                      <div className="text-muted-foreground">Optimize speed without sacrificing accuracy</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-chart-3" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-lg mb-1">Performance trends over time</div>
                      <div className="text-muted-foreground">Visualize your growth journey</div>
                    </div>
                  </li>
                </ul>
                <p className="mt-8 text-lg text-foreground font-semibold border-l-4 border-primary pl-4">
                  You don't just study — you measure progress.
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
                <Card className="relative border-2 border-primary/20 bg-card/90 backdrop-blur-sm shadow-2xl">
                  <CardContent className="p-10">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-6">Live Performance Dashboard</h4>
                    <div className="space-y-6">
                      {[
                        { name: "Medical Terminology", score: 92, color: "from-primary to-accent" },
                        { name: "Pharmacology", score: 85, color: "from-accent to-chart-3" },
                        { name: "Nutrition", score: 78, color: "from-chart-3 to-chart-4" },
                        { name: "Dental Terminology", score: 88, color: "from-chart-4 to-chart-5" },
                        { name: "Behavioral Health", score: 81, color: "from-chart-5 to-primary" },
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-foreground">{item.name}</span>
                            <span className="text-sm font-bold text-primary">{item.score}%</span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
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
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-16 fade-in-section">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                How Practice Sessions Work
              </h2>
              <p className="text-xl text-muted-foreground">
                No guessing what to study next — the system guides you.
              </p>
            </div>

            <div className="relative fade-in-section">
              <div className="space-y-8 md:space-y-10">
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
                    color: "accent"
                  },
                  {
                    num: 3,
                    title: "Review accuracy, timing, and weak areas",
                    desc: "Detailed analytics show exactly where to improve",
                    color: "chart-3"
                  },
                  {
                    num: 4,
                    title: "Revisit missed questions automatically",
                    desc: "Our redemption system ensures you master every topic",
                    color: "chart-4"
                  },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className="fade-in-section practice-step grid grid-cols-[72px_1fr] items-start gap-6 rounded-2xl border border-border/60 bg-card/70 px-6 py-6 shadow-sm md:grid-cols-[96px_1fr]"
                    style={{ transitionDelay: `${idx * 120}ms` }}
                  >
                    <div className="flex items-start justify-center pt-1">
                      <div className={`h-14 w-14 rounded-full bg-${step.color}/15 text-foreground flex items-center justify-center font-bold text-xl`}>
                        {step.num}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-lg">{step.desc}</p>
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
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="mx-auto max-w-5xl fade-in-section">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-chart-3/20 rounded-3xl blur-3xl" />
              <Card className="relative border-2 border-primary/30 bg-gradient-to-br from-card/90 to-muted/50 backdrop-blur-sm shadow-2xl">
                <CardContent className="p-16 text-center">
                  <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
                    Ready to Compete With <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Confidence</span>?
                  </h2>
                  <p className="text-2xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
                    Stop guessing. Start training with purpose.
                  </p>
                  <Button asChild size="lg" className="h-16 px-12 text-xl shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105">
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
      <footer className="bg-muted/50 border-t border-border/50">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="StudyRx Logo" 
                width={32} 
                height={32}
                className="h-8 w-8"
              />
              <span className="text-lg font-bold text-foreground">StudyRx</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 StudyRx. Built for HOSA competitors.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
