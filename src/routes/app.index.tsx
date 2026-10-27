import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileSearch,
  FileStack,
  Gauge,
  LayoutDashboard,
  MessagesSquare,
  Sparkles,
  Star,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRecallStore } from "@/data/recall-store";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Recall AI" },
      {
        name: "description",
        content: "Overview of your uploaded documents, AI conversations, summaries and quizzes.",
      },
      { property: "og:title", content: "Dashboard — Recall AI" },
      {
        property: "og:description",
        content: "Overview of your uploaded documents, AI conversations, summaries and quizzes.",
      },
    ],
  }),
  component: Dashboard,
});

const quickActions = [
  { label: "Upload Study Material", to: "/app/materials", icon: UploadCloud },
  { label: "Upload Question Paper", to: "/app/analysis", icon: FileStack },
  { label: "Ask AI Assistant", to: "/app/assistant", icon: MessagesSquare },
  { label: "Analyze PYQ Papers", to: "/app/analysis", icon: FileSearch },
];

function Dashboard() {
  const store = useRecallStore();
  const readiness = store.readiness;
  const topRec = store.recommendations[0];

  const stats = [
    { label: "Study Materials", value: `${store.materials.length}`, icon: BookOpenCheck, to: "/app/materials", note: "indexed documents" },
    { label: "Previous Papers", value: `${store.papers.length}`, icon: FileStack, to: "/app/analysis", note: "papers analyzed" },
    { label: "Questions Analyzed", value: `${store.questions.length}`, icon: FileSearch, to: "/app/analysis", note: "PYQ questions" },
    { label: "Important Topics", value: `${store.topicFrequencies.length}`, icon: Star, to: "/app/analysis", note: "detected in PYQs" },
  ];

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="A snapshot of your intelligent study workspace, recommendations and exam readiness."
        actions={
          <Button asChild className="rounded-none">
            <Link to="/app/materials">
              <UploadCloud className="mr-1.5 h-4 w-4" /> Upload material
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Link key={s.label} to={s.to} className="animate-fade-in-up" style={{ animationDelay: `${i * 45}ms` }}>
            <Card className="h-full rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5">
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-sans text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="mt-2 text-3xl font-extrabold font-sans text-foreground">{s.value}</p>
                  <p className="mt-1 truncate text-xs font-sans text-muted-foreground">{s.note}</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <s.icon className="h-4 w-4 text-secondary" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Contextual Dashboard Features: Exam Readiness & Study Recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Exam Readiness */}
        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="flex items-center justify-between font-display text-base font-medium">
              <span className="flex items-center gap-2 text-foreground">
                <Gauge className="h-4 w-4 text-secondary" /> Exam Readiness Score
              </span>
              <Badge variant="secondary" className="rounded-sm text-xs font-sans">
                Live Analysis
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {readiness ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-4xl font-bold tracking-tight text-foreground font-sans">
                    {readiness.score}%
                  </span>
                  <span className="text-xs text-muted-foreground font-sans">{readiness.details}</span>
                </div>
                <Progress value={readiness.score} className="h-2 rounded-full bg-muted" />
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 font-sans">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" /> Material Coverage: High
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" /> PYQ Coverage: 3 Years
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm font-semibold font-sans">Not enough data yet.</p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">
                  Upload study materials, PYQ papers, or take practice quizzes to calculate your score.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* STUDY RECOMMENDATION */}
        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="flex items-center justify-between font-display text-base font-medium">
              <span className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-secondary" /> Study Recommendation
              </span>
              <Badge className="rounded-sm bg-secondary text-secondary-foreground text-xs font-sans">
                {topRec?.priority || "High"} Priority
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {topRec ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-medium text-foreground font-display">{topRec.topic}</h3>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    {topRec.subject} • Chapter {topRec.chapterNumber}: {topRec.chapterName}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3.5 space-y-1.5 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">
                    Rationale:
                  </p>
                  <ul className="space-y-1">
                    {topRec.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-sans">
                        <span className="text-secondary font-bold">•</span>
                        <span className="text-foreground/90">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button asChild className="w-full rounded-none font-sans text-xs">
                  <Link to="/app/materials">
                    Study Now <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-sans">
                No active recommendations. Complete a quiz or upload materials to generate tailored study suggestions.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border border-border bg-card shadow-soft lg:col-span-2">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="font-display text-base font-medium">Recent study materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {store.materials.slice(0, 4).map((m) => (
              <Link
                key={m.id}
                to="/app/materials"
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-muted/30"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium font-sans text-foreground">{m.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground font-sans">
                    {m.subject} · Unit {m.chapterNumber}: {m.chapterName} · {m.pagesOrSlides} pages
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="font-display text-base font-medium">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            {quickActions.map((a) => (
              <Button
                key={a.label}
                asChild
                variant="outline"
                className="h-auto w-full justify-start rounded-none py-2.5 font-sans text-xs"
              >
                <Link to={a.to}>
                  <a.icon className="mr-2 h-4 w-4 shrink-0 text-secondary" />
                  <span className="truncate">{a.label}</span>
                </Link>
              </Button>
            ))}
            <div className="rounded-xl bg-accent p-3.5 text-accent-foreground border border-accent/40 mt-3">
              <Badge variant="secondary" className="rounded-sm text-[11px] font-sans">
                Tip
              </Badge>
              <p className="mt-2 text-xs leading-relaxed font-sans opacity-90">
                Upload at least three years of question papers for the most reliable repeated-question
                analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


