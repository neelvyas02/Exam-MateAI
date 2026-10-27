import { createFileRoute, Link } from "@tanstack/react-router";
import { ListChecks, Sparkles, CheckCircle, XCircle, RotateCcw, MessagesSquare, Award } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecallStore, QuizQuestion } from "@/data/recall-store";

export const Route = createFileRoute("/app/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Generator — Recall AI" },
      {
        name: "description",
        content: "Generate practice multiple-choice questions from study materials, PYQs, high frequency or weak topics.",
      },
      { property: "og:title", content: "Quiz Generator — Recall AI" },
      {
        property: "og:description",
        content: "Generate practice multiple-choice questions from study materials, PYQs, high frequency or weak topics.",
      },
    ],
  }),
  component: QuizPage,
});

const generatedQuizSeed: QuizQuestion[] = [
  {
    id: "gq1",
    question: "In Natural Language Processing, which processing stage is primarily responsible for building syntactic parse trees from context-free grammars?",
    options: ["Morphological Analysis", "Syntactic Parsing", "Semantic Analysis", "Discourse Integration"],
    correctAnswer: 1,
    explanation: "Syntactic parsing processes structural tokens against CFG production rules to build dependency and parse trees.",
    topic: "Natural Language Processing",
    sourceDoc: "NLP Notes & Semantic Processing.pdf",
    sourcePageOrSlide: "Page 14",
  },
  {
    id: "gq2",
    question: "Which of the following is a non-trivial functional dependency condition required for Boyce-Codd Normal Form (BCNF)?",
    options: [
      "Every determinant X in X -> Y must be a candidate key / super key",
      "Y must be a prime attribute only",
      "No transitive dependencies can exist on non-prime attributes",
      "Primary key must consist of multiple composite attributes",
    ],
    correctAnswer: 0,
    explanation: "BCNF strictly requires that for every non-trivial functional dependency X -> Y, X must be a super key.",
    topic: "Normalization & DBMS",
    sourceDoc: "DBMS-Complete-Notes.pdf",
    sourcePageOrSlide: "Page 86",
  },
  {
    id: "gq3",
    question: "In Deadlock Avoidance, the Banker's Algorithm evaluates a state as SAFE if and only if:",
    options: [
      "No processes are currently requesting mutex semaphores",
      "A safe sequence exists in which all processes can eventually execute to completion",
      "Available resources exceed maximum allocated resources across all threads",
      "All deadlock conditions are satisfied simultaneously",
    ],
    correctAnswer: 1,
    explanation: "A safe state guarantees that an execution order exists where every process can acquire its max claim and terminate cleanly.",
    topic: "Operating Systems & Deadlocks",
    sourceDoc: "Operating-Systems-Unit-1-to-3.pdf",
    sourcePageOrSlide: "Page 62",
  },
];

export function QuizPage() {
  const store = useRecallStore();
  const [subject, setSubject] = useState("Artificial Intelligence");
  const [chapter, setChapter] = useState("all");
  const [source, setSource] = useState<
    "Study Material" | "Previous Year Questions" | "Frequently Asked Topics" | "Weak Topics"
  >("Study Material");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [count, setCount] = useState("5");

  const [loading, setLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[] | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [activeBackendQuizId, setActiveBackendQuizId] = useState<string | null>(null);

  const handleGenerateQuiz = async () => {
    setLoading(true);
    setActiveQuiz(null);
    setUserAnswers({});
    setQuizSubmitted(false);
    setActiveBackendQuizId(null);

    try {
      if (store.backendAvailable) {
        const subjectId = store.subjects[0]?.id || "00000000-0000-0000-0000-000000000000";
        const qCountInt = parseInt(count) || 5;
        const quizDto = await store.generateQuizAsync(subjectId, difficulty, qCountInt);

        setActiveBackendQuizId(quizDto.id);
        const mappedQuestions: QuizQuestion[] = quizDto.questions.map((q) => {
          let correctIndex = 0;
          if (q.correctAnswer === "B" || q.correctAnswer === "1") correctIndex = 1;
          else if (q.correctAnswer === "C" || q.correctAnswer === "2") correctIndex = 2;
          else if (q.correctAnswer === "D" || q.correctAnswer === "3") correctIndex = 3;

          return {
            id: q.id,
            question: q.question,
            options: [q.optionA, q.optionB, q.optionC, q.optionD],
            correctAnswer: correctIndex,
            explanation: q.explanation || "Correct answer based on course materials.",
            topic: quizDto.subjectName || "General Quiz Topic",
            sourceDoc: quizDto.title || "ExamMate AI Generated Quiz",
          };
        });

        setActiveQuiz(mappedQuestions);
        toast.success(`Generated ${mappedQuestions.length} quiz questions from ${source}`);
      } else {
        setTimeout(() => {
          setActiveQuiz(generatedQuizSeed);
          toast.success(`Generated ${count} quiz questions from ${source} (Offline mode)`);
        }, 800);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz from backend.");
      // Fallback
      setActiveQuiz(generatedQuizSeed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!activeQuiz) return;
    setQuizSubmitted(true);

    if (store.backendAvailable && activeBackendQuizId) {
      try {
        const answerPayload = activeQuiz.map((q, idx) => {
          const selectedIdx = userAnswers[idx];
          let optionLetter = "A";
          if (selectedIdx === 1) optionLetter = "B";
          if (selectedIdx === 2) optionLetter = "C";
          if (selectedIdx === 3) optionLetter = "D";
          return {
            questionId: q.id,
            selectedOption: optionLetter,
          };
        });

        const result = await store.submitQuizAsync(activeBackendQuizId, answerPayload);
        toast.success(`Quiz evaluation complete! Score: ${result.score}/${result.totalQuestions} (${Math.round(result.percentage)}%)`);
        return;
      } catch (err: any) {
        toast.error(err.message || "Failed to submit quiz to backend");
      }
    }

    let correctCount = 0;
    const weakList: string[] = [];
    const strongList: string[] = [];

    activeQuiz.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correctCount++;
        strongList.push(q.topic);
      } else {
        weakList.push(q.topic);
      }
    });

    const scorePct = Math.round((correctCount / activeQuiz.length) * 100);

    store.recordQuizAttempt({
      id: `qa_${Date.now()}`,
      subject,
      chapter: chapter !== "all" ? chapter : undefined,
      source,
      difficulty,
      totalQuestions: activeQuiz.length,
      score: correctCount,
      percentage: scorePct,
      completedAt: new Date().toISOString().split("T")[0],
      strongTopics: Array.from(new Set(strongList)),
      weakTopics: Array.from(new Set(weakList)),
    });

    toast.success(`Quiz evaluation complete! Score: ${correctCount}/${activeQuiz.length} (${scorePct}%)`);
  };

  return (
    <>
      <PageHeader
        icon={ListChecks}
        title="Quiz"
        description="Configure and generate practice MCQs from study materials, PYQs, frequently asked or weak topics."
      />

      {/* QUIZ SETUP CONTROLS */}
      <Card className="rounded-2xl border border-border bg-card shadow-soft font-sans">
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="rounded-md text-xs h-9">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Artificial Intelligence">Artificial Intelligence</SelectItem>
                <SelectItem value="Operating Systems">Operating Systems</SelectItem>
                <SelectItem value="Database Systems">Database Systems</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Chapter</Label>
            <Select value={chapter} onValueChange={setChapter}>
              <SelectTrigger className="rounded-md text-xs h-9">
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chapters</SelectItem>
                <SelectItem value="01">Unit 01 — Introduction</SelectItem>
                <SelectItem value="02">Unit 02 — Industrial AI</SelectItem>
                <SelectItem value="03">Unit 03 — Knowledge Representation & NLP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Question Source</Label>
            <Select value={source} onValueChange={(v: any) => setSource(v)}>
              <SelectTrigger className="rounded-md text-xs h-9">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Study Material">Study Material</SelectItem>
                <SelectItem value="Previous Year Questions">Previous Year Questions</SelectItem>
                <SelectItem value="Frequently Asked Topics">Frequently Asked Topics</SelectItem>
                <SelectItem value="Weak Topics">Weak Topics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Difficulty</Label>
            <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
              <SelectTrigger className="rounded-md text-xs h-9">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Question Count</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger className="rounded-md text-xs h-9">
                <SelectValue placeholder="Count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="20">20 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 lg:col-span-5 pt-2">
            <Button
              className="w-full sm:w-auto rounded-none text-xs"
              disabled={loading}
              onClick={handleGenerateQuiz}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {loading ? "Generating Quiz…" : "Generate Practice Quiz"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RESTRAINED LOADING STATE */}
      {loading && (
        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardContent className="flex items-center gap-2.5 p-6 text-xs text-muted-foreground font-sans">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            <span>Generating practice quiz from course materials…</span>
          </CardContent>
        </Card>
      )}

      {/* ACTIVE QUIZ PLAYER */}
      {activeQuiz && !loading && (
        <div className="space-y-6">
          {/* QUIZ RESULTS HEADER IF SUBMITTED */}
          {quizSubmitted && (
            <Card className="rounded-2xl border border-border bg-accent/20 shadow-soft">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="font-display text-base font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2 text-foreground">
                    <Award className="h-5 w-5 text-secondary" /> Quiz Evaluation Results
                  </span>
                  <Badge variant="secondary" className="rounded-sm text-xs font-sans">
                    Completed
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs font-sans">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-xl border border-border bg-card p-3.5">
                    <span className="text-muted-foreground block text-[11px]">Score</span>
                    <span className="text-2xl font-bold text-foreground mt-0.5 block">
                      {Object.keys(userAnswers).filter(
                        (k) => userAnswers[Number(k)] === activeQuiz[Number(k)].correctAnswer
                      ).length}{" "}
                      / {activeQuiz.length}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3.5">
                    <span className="text-muted-foreground block text-[11px]">Percentage</span>
                    <span className="text-2xl font-bold text-secondary mt-0.5 block">
                      {Math.round(
                        (Object.keys(userAnswers).filter(
                          (k) => userAnswers[Number(k)] === activeQuiz[Number(k)].correctAnswer
                        ).length /
                          activeQuiz.length) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3.5">
                    <span className="text-muted-foreground block text-[11px]">Strong Topics</span>
                    <span className="font-semibold text-success block mt-1">
                      {activeQuiz
                        .filter((q, i) => userAnswers[i] === q.correctAnswer)
                        .map((q) => q.topic)
                        .join(", ") || "None"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3.5">
                    <span className="text-muted-foreground block text-[11px]">Weak Topics</span>
                    <span className="font-semibold text-destructive block mt-1">
                      {activeQuiz
                        .filter((q, i) => userAnswers[i] !== q.correctAnswer)
                        .map((q) => q.topic)
                        .join(", ") || "None"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none text-xs font-sans"
                    onClick={handleGenerateQuiz}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Generate New Quiz
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-none text-xs font-sans">
                    <Link to="/app/materials">Review Weak Topics</Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-none text-xs font-sans">
                    <Link to="/app/assistant">
                      <MessagesSquare className="mr-1.5 h-3.5 w-3.5" /> Ask AI
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QUESTIONS LIST */}
          <div className="grid gap-5">
            {activeQuiz.map((item, qi) => {
              const selectedOption = userAnswers[qi];
              const isRevealed = quizSubmitted;

              return (
                <Card key={item.id} className="rounded-2xl border border-border bg-card shadow-soft">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-border pb-3 font-sans">
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-sm text-xs bg-primary text-primary-foreground">{qi + 1}</Badge>
                        <Badge variant="outline" className="rounded-sm text-[11px]">
                          Topic: {item.topic}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Source: {item.sourceDoc} {item.sourcePageOrSlide ? `(${item.sourcePageOrSlide})` : ""}
                      </span>
                    </div>

                    <p className="font-display font-medium text-base text-foreground leading-relaxed">{item.question}</p>

                    <div className="grid gap-2.5 sm:grid-cols-2 font-sans">
                      {item.options.map((opt, oi) => {
                        const isSelected = selectedOption === oi;
                        const isCorrect = item.correctAnswer === oi;

                        let btnStyle = "border-border hover:border-secondary/60 hover:bg-accent/40 bg-card";
                        if (isRevealed) {
                          if (isCorrect) btnStyle = "border-success bg-success/10 font-bold text-foreground";
                          else if (isSelected && !isCorrect)
                            btnStyle = "border-destructive bg-destructive/10 text-destructive";
                        } else if (isSelected) {
                          btnStyle = "border-secondary bg-accent text-secondary font-semibold";
                        }

                        return (
                          <button
                            key={opt}
                            disabled={quizSubmitted}
                            onClick={() => setUserAnswers((prev) => ({ ...prev, [qi]: oi }))}
                            className={`rounded-none border p-3.5 text-left text-xs transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                          >
                            <span>
                              <span className="mr-2 font-bold text-muted-foreground">
                                {String.fromCharCode(65 + oi)}.
                              </span>
                              {opt}
                            </span>
                            {isRevealed && isCorrect && (
                              <CheckCircle className="h-4 w-4 text-success shrink-0" />
                            )}
                            {isRevealed && isSelected && !isCorrect && (
                              <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isRevealed && (
                      <div className="rounded-xl bg-muted/30 border border-border p-4 text-xs font-sans space-y-1">
                        <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[10px]">
                          Explanation:
                        </span>
                        <p className="text-foreground leading-relaxed font-serif">{item.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!quizSubmitted && (
            <div className="flex justify-end pt-2">
              <Button
                className="rounded-none text-xs font-sans px-6"
                disabled={Object.keys(userAnswers).length === 0}
                onClick={handleSubmitAnswers}
              >
                Submit Quiz & View Results
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}


