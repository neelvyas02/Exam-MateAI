import { createFileRoute } from "@tanstack/react-router";
import { Flame, Layers, Lightbulb, Repeat, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/app/topics")({
  head: () => ({
    meta: [
      { title: "Important Topics — ExamMate AI" },
      {
        name: "description",
        content: "Frequently asked topics, repeated concepts and high-weightage units from your papers.",
      },
      { property: "og:title", content: "Important Topics — ExamMate AI" },
      {
        property: "og:description",
        content: "Frequently asked topics, repeated concepts and high-weightage units from your papers.",
      },
    ],
  }),
  component: TopicsPage,
});

// Placeholder data for UI demonstration only.
const frequent = [
  { topic: "Deadlock handling", asked: 9 },
  { topic: "CPU scheduling algorithms", asked: 8 },
  { topic: "Page replacement", asked: 7 },
  { topic: "Process synchronization", asked: 6 },
  { topic: "Normalization", asked: 6 },
  { topic: "Transaction & concurrency control", asked: 5 },
];

const repeated = [
  "Banker's algorithm numerical",
  "LRU vs FIFO comparison",
  "Peterson's solution",
  "ACID properties",
  "TCP three-way handshake",
  "B+ tree indexing",
];

const units = [
  { unit: "Unit 2 — Process Management", weight: 26 },
  { unit: "Unit 3 — Memory Management", weight: 22 },
  { unit: "Unit 5 — File & I/O Systems", weight: 20 },
  { unit: "Unit 1 — Introduction", weight: 18 },
  { unit: "Unit 4 — Deadlocks", weight: 14 },
];

const concepts = [
  { title: "Safe state", note: "Central to every deadlock-avoidance question." },
  { title: "Thrashing", note: "Appears alongside working-set model questions." },
  { title: "Functional dependency", note: "Prerequisite for all normalization numericals." },
  { title: "Two-phase locking", note: "Recurring in concurrency-control theory questions." },
];

function TopicsPage() {
  const max = frequent[0].asked;

  return (
    <>
      <PageHeader
        icon={Star}
        title="Important Topics"
        description="What your uploaded papers suggest you should revise first. Placeholder values shown."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-foreground">
              <Flame className="h-4 w-4 text-secondary" /> Frequently asked topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 font-sans">
            {frequent.map((f) => (
              <div key={f.topic}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <p className="truncate text-sm font-medium text-foreground">{f.topic}</p>
                  <Badge variant="secondary" className="shrink-0 rounded-sm text-[11px]">
                    {f.asked}× asked
                  </Badge>
                </div>
                <Progress value={(f.asked / max) * 100} className="mt-2 h-2 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-foreground">
              <Repeat className="h-4 w-4 text-secondary" /> Repeated topics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 font-sans">
            <div className="flex flex-wrap gap-2">
              {repeated.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="rounded-sm px-3 py-1 text-xs transition-colors hover:bg-accent"
                >
                  {r}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-foreground">
              <Layers className="h-4 w-4 text-secondary" /> High weightage units
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 font-sans">
            {units.map((u) => (
              <div
                key={u.unit}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3.5 transition-colors hover:bg-accent/40"
              >
                <p className="truncate text-sm font-medium text-foreground">{u.unit}</p>
                <Badge className="shrink-0 rounded-sm text-[11px] bg-secondary text-secondary-foreground">{u.weight} marks</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display font-medium text-foreground">
              <Lightbulb className="h-4 w-4 text-secondary" /> Important concepts
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {concepts.map((c) => (
              <div key={c.title} className="rounded-xl bg-muted/50 p-4">
                <p className="truncate text-sm font-semibold">{c.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
