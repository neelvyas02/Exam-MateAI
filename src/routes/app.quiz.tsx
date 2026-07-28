import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { studyMaterials, subjects } from "@/data/placeholder";

export const Route = createFileRoute("/app/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Generator — ExamMate AI" },
      {
        name: "description",
        content: "Generate practice multiple-choice questions from your uploaded study documents.",
      },
      { property: "og:title", content: "Quiz Generator — ExamMate AI" },
      {
        property: "og:description",
        content: "Generate practice multiple-choice questions from your uploaded study documents.",
      },
    ],
  }),
  component: QuizPage,
});

// Placeholder quiz structure for UI demonstration only.
const placeholderQuiz = [
  {
    q: "Which condition is NOT required for a deadlock to occur?",
    options: ["Mutual exclusion", "Hold and wait", "Preemption of resources", "Circular wait"],
    answer: 2,
  },
  {
    q: "In the banker's algorithm, a state is safe when…",
    options: [
      "Every process holds its maximum claim",
      "A sequence exists in which all processes can finish",
      "No process is waiting",
      "All resources are allocated",
    ],
    answer: 1,
  },
  {
    q: "Which page replacement policy can suffer from Belady's anomaly?",
    options: ["LRU", "Optimal", "FIFO", "Clock"],
    answer: 2,
  },
];

function QuizPage() {
  const [subject, setSubject] = useState("");
  const [doc, setDoc] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState([10]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<Record<number, number>>({});

  return (
    <>
      <PageHeader
        icon={ListChecks}
        title="Quiz Generator"
        description="Build practice MCQs from a chosen document, at the difficulty and length you want."
      />

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-4">
          <div className="min-w-0 space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Document</Label>
            <Select value={doc} onValueChange={setDoc}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select PDF" />
              </SelectTrigger>
              <SelectContent>
                {studyMaterials
                  .filter((m) => !subject || m.subject === subject)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Number of questions: {count[0]}</Label>
            <Slider value={count} onValueChange={setCount} min={5} max={30} step={5} className="pt-3" />
          </div>
          <div className="lg:col-span-4">
            <Button
              className="w-full rounded-xl sm:w-auto"
              disabled={!doc || loading}
              onClick={() => {
                setLoading(true);
                setReady(false);
                setPicked({});
                setTimeout(() => {
                  setLoading(false);
                  setReady(true);
                  toast.info("Connect a backend to generate real questions from this PDF.");
                }, 1300);
              }}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {loading ? "Generating quiz…" : "Generate Quiz"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl shadow-soft">
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : ready ? (
        <div className="grid gap-4">
          {placeholderQuiz.map((item, qi) => (
            <Card key={item.q} className="animate-rise rounded-2xl shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Badge className="shrink-0 rounded-full">{qi + 1}</Badge>
                  <p className="min-w-0 text-sm font-semibold">{item.q}</p>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {item.options.map((opt, oi) => {
                    const chosen = picked[qi] === oi;
                    const revealed = picked[qi] !== undefined;
                    const correct = oi === item.answer;
                    return (
                      <button
                        key={opt}
                        onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                        className={[
                          "rounded-xl border px-4 py-3 text-left text-sm transition-all",
                          revealed && correct
                            ? "border-success bg-success/10"
                            : chosen
                              ? "border-destructive bg-destructive/10"
                              : "hover:border-primary/60 hover:bg-accent/50",
                        ].join(" ")}
                      >
                        <span className="mr-2 font-semibold text-muted-foreground">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="No quiz generated yet"
          description="Choose a document, difficulty and question count, then generate a practice set."
        />
      )}
    </>
  );
}
