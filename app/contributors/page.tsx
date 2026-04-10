"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles, Trophy, Users, ArrowRight, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CONTRIBUTORS } from "@/lib/contributors";

const totalQuestions = CONTRIBUTORS.reduce((sum, contributor) => sum + contributor.questionsContributed, 0);

export default function ContributorsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.20),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.18),transparent_35%)]" />
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background to-accent/10 p-8 md:p-12">
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Question Contributors
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Built with student brilliance.</h1>
            <p className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">
              Huge thanks to every contributor who wrote, refined, and reviewed question banks for StudyRx. Your work helps thousands of HOSA students practice smarter.
            </p>
          </div>
          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard label="Contributors" value={`${CONTRIBUTORS.length}`} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Questions Added" value={`${totalQuestions}`} icon={<Activity className="h-4 w-4" />} />
            <StatCard label="Events Covered" value={`${new Set(CONTRIBUTORS.map((c) => c.eventName)).size}`} icon={<Trophy className="h-4 w-4" />} />
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {CONTRIBUTORS.map((contributor, index) => (
            <Card
              key={`${contributor.name}-${contributor.eventId}`}
              className="group border-primary/20 bg-card/90 shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold">{contributor.name}</p>
                    <p className="text-sm text-muted-foreground">{contributor.eventName}</p>
                  </div>
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {contributor.questionsContributed} questions
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{contributor.note}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-primary/20 bg-muted/20 p-6 text-center">
          <p className="text-lg font-semibold">Thank you for helping make StudyRx stronger for every competitor.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Want to help expand question banks? Reach out through the feedback form.
          </p>
          <Link href="/submit-feedback" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Become a contributor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-background/70 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
