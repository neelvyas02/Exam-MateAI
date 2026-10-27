import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — ExamMateAI" },
      {
        name: "description",
        content:
          "ExamMateAI is an AI-powered study companion designed to help students turn study materials and previous-year question papers into a focused exam-preparation experience.",
      },
      { property: "og:title", content: "About — ExamMateAI" },
      {
        property: "og:description",
        content:
          "ExamMateAI is an AI-powered study companion designed to help students turn study materials and previous-year question papers into a focused exam-preparation experience.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <PublicHeader />

      <main className="mx-auto max-w-[1200px] px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <Badge variant="outline" className="rounded-sm text-xs font-sans mb-4">
            About
          </Badge>

          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            About ExamMateAI
          </h1>

          <Card className="mt-8 rounded-2xl border border-border bg-card shadow-soft">
            <CardContent className="p-8 space-y-6 text-base font-sans leading-relaxed text-muted-foreground">
              <p>
                ExamMateAI is an AI-powered study companion designed to help students turn their study materials and previous-year question papers into a more focused exam-preparation experience.
              </p>
              <p>
                It brings study materials, document-grounded AI assistance, PYQ analysis, summaries and quizzes together in one place.
              </p>
              <p className="font-medium text-foreground text-lg border-l-2 border-secondary pl-4 py-1">
                The goal is simple: Help students spend less time searching through materials and more time understanding, practicing and preparing.
              </p>
            </CardContent>
          </Card>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-none font-bold tracking-wider uppercase text-xs px-7 h-11">
              <Link to="/register">GET STARTED</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-none font-bold tracking-wider uppercase text-xs px-7 h-11">
              <Link to="/features">VIEW ALL FEATURES</Link>
            </Button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
