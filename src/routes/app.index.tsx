import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpenCheck,
  FileSearch,
  FileStack,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  ScrollText,
  Star,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recentActivity } from "@/data/placeholder";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ExamMate AI" },
      {
        name: "description",
        content: "Overview of your uploaded documents, AI conversations, summaries and quizzes.",
      },
      { property: "og:title", content: "Dashboard — ExamMate AI" },
      {
        property: "og:description",
        content: "Overview of your uploaded documents, AI conversations, summaries and quizzes.",
      },
    ],
  }),
  component: Dashboard,
});

const stats = [
  { label: "Uploaded PDFs", value: "3", icon: BookOpenCheck, to: "/app/materials", note: "study materials" },
  { label: "Previous Papers", value: "3", icon: FileStack, to: "/app/papers", note: "2 analyzed" },
  { label: "AI Conversations", value: "12", icon: MessagesSquare, to: "/app/assistant", note: "this month" },
  { label: "Generated Notes", value: "5", icon: ScrollText, to: "/app/summarizer", note: "summaries" },
  { label: "Generated Quizzes", value: "4", icon: ListChecks, to: "/app/quiz", note: "practice sets" },
  { label: "Important Topics", value: "18", icon: Star, to: "/app/topics", note: "detected" },
];

const quickActions = [
  { label: "Upload Study Material", to: "/app/materials", icon: UploadCloud },
  { label: "Upload Previous Paper", to: "/app/papers", icon: FileStack },
  { label: "Ask AI", to: "/app/assistant", icon: MessagesSquare },
  { label: "Analyze Papers", to: "/app/analysis", icon: FileSearch },
];

function Dashboard() {
  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="A snapshot of your document workspace and everything AI has produced from it."
        actions={
          <Button asChild className="rounded-xl">
            <Link to="/app/materials">
              <UploadCloud className="mr-1.5 h-4 w-4" /> Upload material
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <Link key={s.label} to={s.to} className="animate-rise" style={{ animationDelay: `${i * 45}ms` }}>
            <Card className="h-full rounded-2xl shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-3xl font-extrabold">{s.value}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{s.note}</p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-2xl shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl border bg-card/60 p-3.5 transition-colors hover:bg-accent/40"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.meta}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {quickActions.map((a) => (
              <Button
                key={a.label}
                asChild
                variant="outline"
                className="h-auto w-full justify-start rounded-xl py-3"
              >
                <Link to={a.to}>
                  <a.icon className="mr-2 h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{a.label}</span>
                </Link>
              </Button>
            ))}
            <div className="rounded-xl bg-accent p-3.5 text-accent-foreground">
              <Badge variant="secondary" className="rounded-full text-[11px]">
                Tip
              </Badge>
              <p className="mt-2 text-xs leading-relaxed">
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
