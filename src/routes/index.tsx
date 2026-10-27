import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  FileSearch,
  ListChecks,
  MessagesSquare,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExamMateAI — Study Smarter. Prepare Better." },
      {
        name: "description",
        content:
          "ExamMateAI helps students organize study materials, understand documents with grounded AI, analyze previous-year questions and practice with targeted quizzes.",
      },
      { property: "og:title", content: "ExamMateAI — Study Smarter. Prepare Better." },
      {
        property: "og:description",
        content:
          "ExamMateAI helps students organize study materials, understand documents with grounded AI, analyze previous-year questions and practice with targeted quizzes.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <PublicHeader />

      <main>
        {/* HERO SECTION */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-[1200px] px-6 py-20 text-center lg:py-24">
            <Badge variant="outline" className="mx-auto w-fit rounded-sm px-3.5 py-1 text-xs font-sans mb-6">
              Academic Study Companion
            </Badge>

            <h1 className="mx-auto font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              ExamMateAI
            </h1>

            <p className="mx-auto mt-4 font-display text-2xl font-medium text-secondary sm:text-3xl">
              Study smarter. Prepare better.
            </p>

            <p className="mx-auto mt-6 max-w-2xl text-base font-sans leading-relaxed text-muted-foreground sm:text-lg">
              ExamMateAI helps students organize their study materials, understand their documents with grounded AI, analyze previous-year questions and practice with targeted quizzes.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-none font-bold tracking-wider uppercase text-xs px-7 h-11">
                <Link to="/register">GET STARTED</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-none font-bold tracking-wider uppercase text-xs px-7 h-11 border-primary text-primary hover:bg-accent">
                <Link to="/features">
                  EXPLORE FEATURES <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* WHY EXAMMATEAI */}
        <section className="border-b border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-[1200px] px-6 text-center">
            <div className="mx-auto max-w-3xl">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Why ExamMateAI?
              </h2>
              <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground sm:text-base">
                Students often have notes, PDFs, presentations and previous-year question papers scattered across different places. ExamMateAI brings them together into one focused study environment for understanding, analysis and exam preparation.
              </p>
            </div>
          </div>
        </section>

        {/* CAPABILITY OVERVIEW */}
        <section className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="outline" className="rounded-sm text-xs mb-3">
              Overview
            </Badge>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Core Capabilities
            </h2>
            <p className="mt-2 text-sm text-muted-foreground font-sans">
              Four focused steps designed for effective course learning and revision.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* LEARN */}
            <Card className="rounded-2xl border border-border bg-card shadow-soft flex flex-col justify-between">
              <CardContent className="p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground mb-4">
                  <BookOpen className="h-5 w-5 text-secondary" />
                </span>
                <h3 className="font-display font-medium text-lg text-foreground">Learn</h3>
                <p className="mt-2 text-xs font-sans text-muted-foreground leading-relaxed">
                  Organize and understand your study materials automatically by Subject and Chapter.
                </p>
                <div className="mt-6 pt-4 border-t border-border">
                  <Link
                    to="/features"
                    className="inline-flex items-center text-xs font-bold text-secondary uppercase tracking-wider hover:underline"
                  >
                    LEARN MORE <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* UNDERSTAND */}
            <Card className="rounded-2xl border border-border bg-card shadow-soft flex flex-col justify-between">
              <CardContent className="p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground mb-4">
                  <MessagesSquare className="h-5 w-5 text-secondary" />
                </span>
                <h3 className="font-display font-medium text-lg text-foreground">Understand</h3>
                <p className="mt-2 text-xs font-sans text-muted-foreground leading-relaxed">
                  Ask questions about your notes and get answers grounded in your own uploaded documents.
                </p>
                <div className="mt-6 pt-4 border-t border-border">
                  <Link
                    to="/features"
                    className="inline-flex items-center text-xs font-bold text-secondary uppercase tracking-wider hover:underline"
                  >
                    LEARN MORE <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* PREPARE */}
            <Card className="rounded-2xl border border-border bg-card shadow-soft flex flex-col justify-between">
              <CardContent className="p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground mb-4">
                  <FileSearch className="h-5 w-5 text-secondary" />
                </span>
                <h3 className="font-display font-medium text-lg text-foreground">Prepare</h3>
                <p className="mt-2 text-xs font-sans text-muted-foreground leading-relaxed">
                  Analyze previous-year questions, detect repeated topics and identify high-weightage units.
                </p>
                <div className="mt-6 pt-4 border-t border-border">
                  <Link
                    to="/features"
                    className="inline-flex items-center text-xs font-bold text-secondary uppercase tracking-wider hover:underline"
                  >
                    LEARN MORE <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* PRACTICE */}
            <Card className="rounded-2xl border border-border bg-card shadow-soft flex flex-col justify-between">
              <CardContent className="p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground mb-4">
                  <ListChecks className="h-5 w-5 text-secondary" />
                </span>
                <h3 className="font-display font-medium text-lg text-foreground">Practice</h3>
                <p className="mt-2 text-xs font-sans text-muted-foreground leading-relaxed">
                  Generate custom practice quizzes, evaluate scores and track weak areas for targeted revision.
                </p>
                <div className="mt-6 pt-4 border-t border-border">
                  <Link
                    to="/features"
                    className="inline-flex items-center text-xs font-bold text-secondary uppercase tracking-wider hover:underline"
                  >
                    LEARN MORE <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="border-t border-border bg-muted/20 py-16">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Ready to prepare smarter?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground font-sans">
              Get started with ExamMateAI to organize your study materials and accelerate your exam preparation.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="rounded-none font-bold tracking-wider uppercase text-xs px-8 h-11">
                <Link to="/register">GET STARTED</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
