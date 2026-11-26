import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  Loader2,
  MessagesSquare,
  RefreshCw,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecallStore } from "@/data/recall-store";
import { documentsApi, DocumentDto, QuizDto, QuizQuestionDto } from "@/lib/api";

export const Route = createFileRoute("/app/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Generator — ExamMateAI" },
      {
        name: "description",
        content: "Generate exam practice quizzes grounded directly in your uploaded lecture slides, notes, and study material.",
      },
    ],
  }),
  component: QuizPage,
});

export function QuizPage() {
  const store = useRecallStore();

  // Documents state
  const [userDocs, setUserDocs] = useState<DocumentDto[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);

  // Configuration state
  const [sourceMode, setSourceMode] = useState<"document" | "multiple" | "general">("document");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Mixed">("Medium");
  const [questionCount, setQuestionCount] = useState<string>("5");
  const [questionType, setQuestionType] = useState<"MCQ" | "TrueFalse" | "Mixed">("MCQ");

  // Quiz active state
  const [generating, setGenerating] = useState<boolean>(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizDto | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({}); // questionId -> "A" | "B" | "C" | "D"
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState<boolean>(false);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    evaluatedQuestions: QuizQuestionDto[];
  } | null>(null);

  // Load documents from backend
  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      if (store.backendAvailable) {
        const docs = await documentsApi.getUserDocuments();
        setUserDocs(docs);

        // Preselect the first ready document if none selected
        const readyDocs = docs.filter((d) => d.processingStatus === "Ready");
        if (readyDocs.length > 0 && !selectedDocId) {
          setSelectedDocId(readyDocs[0].id);
          if (readyDocs[0].subjectId) {
            setSelectedSubjectId(readyDocs[0].subjectId);
          }
        }
      }
    } catch (err: any) {
      console.warn("Could not load user documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [store.backendAvailable]);

  // Set default subject if not set
  useEffect(() => {
    if (store.subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(store.subjects[0].id);
    }
  }, [store.subjects, selectedSubjectId]);

  // Eligible documents (excluding failed or deleted)
  const eligibleDocs = useMemo(() => {
    return userDocs.filter(
      (d) => d.documentType === "StudyMaterial" || d.documentType === "0" || !d.documentType
    );
  }, [userDocs]);

  // When selected document changes, sync subject
  const handleSelectDoc = (docId: string) => {
    setSelectedDocId(docId);
    const doc = userDocs.find((d) => d.id === docId);
    if (doc?.subjectId) {
      setSelectedSubjectId(doc.subjectId);
    }
  };

  // Toggle multi-doc selection
  const toggleDocMulti = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Generate quiz handler
  const handleGenerateQuiz = async () => {
    // Validation
    if (sourceMode === "document") {
      if (!selectedDocId) {
        toast.error("Please select an uploaded study document.");
        return;
      }
      const doc = userDocs.find((d) => d.id === selectedDocId);
      if (doc && doc.processingStatus !== "Ready") {
        toast.error(
          `Document "${doc.originalName || doc.fileName}" is not ready. Status: ${doc.processingStatus}`
        );
        return;
      }
    } else if (sourceMode === "multiple") {
      if (selectedDocIds.size === 0) {
        toast.error("Please select at least one study document.");
        return;
      }
    } else {
      if (!selectedSubjectId) {
        toast.error("Please select a subject for general knowledge practice.");
        return;
      }
    }

    setGenerating(true);
    setActiveQuiz(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setQuizSubmitted(false);
    setSubmissionResult(null);

    try {
      const qCountInt = parseInt(questionCount, 10) || 5;
      const targetSubject = store.subjects.find((s) => s.id === selectedSubjectId);

      const payload: any = {
        difficulty,
        questionCount: qCountInt,
        questionType,
        topic: targetSubject?.name || "General Knowledge",
      };

      if (sourceMode === "document") {
        payload.documentId = selectedDocId;
        payload.subjectId = selectedSubjectId || undefined;
      } else if (sourceMode === "multiple") {
        payload.documentIds = Array.from(selectedDocIds);
        payload.subjectId = selectedSubjectId || undefined;
      } else {
        payload.subjectId = selectedSubjectId;
      }

      const generated = await store.generateQuizAsync(payload);
      setActiveQuiz(generated);
      toast.success(
        `Generated ${generated.questions.length} questions grounded in ${
          sourceMode === "document" ? "selected document" : "study material"
        }!`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quiz from selected material.");
    } finally {
      setGenerating(false);
    }
  };

  // Record an answer for the current question
  const handleSelectAnswer = (questionId: string, optionLetter: string) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionLetter,
    }));
  };

  // Confirm submit modal trigger
  const handleConfirmSubmitTrigger = () => {
    if (!activeQuiz) return;
    setSubmitConfirmOpen(true);
  };

  // Final submission handler
  const handleFinalSubmit = async () => {
    if (!activeQuiz) return;
    setSubmitConfirmOpen(false);
    setIsSubmitting(true);

    try {
      const answersPayload = activeQuiz.questions.map((q) => ({
        questionId: q.id,
        selectedOption: userAnswers[q.id] || "",
      }));

      const result = await store.submitQuizAsync(activeQuiz.id, answersPayload);

      setSubmissionResult({
        score: result.score,
        total: result.totalQuestions,
        percentage: Math.round(result.percentage),
        evaluatedQuestions: result.questions,
      });

      setQuizSubmitted(true);
      toast.success(
        `Quiz submitted! Your Score: ${result.score}/${result.totalQuestions} (${Math.round(result.percentage)}%)`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quiz answers");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retry quiz (same questions, reset answers)
  const handleRetryQuiz = () => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setQuizSubmitted(false);
    setSubmissionResult(null);
    toast.info("Quiz reset. Good luck on your retry!");
  };

  // Question navigation
  const currentQuestion = activeQuiz?.questions[currentQuestionIndex];
  const totalQuestions = activeQuiz?.questions.length || 0;
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  return (
    <>
      <PageHeader
        icon={ListChecks}
        title="Quiz Generator"
        description="Generate evidence-grounded practice quizzes directly from your uploaded slides, notes, and study material."
      />

      {/* 1. QUIZ CONFIGURATION CARD (Shown when not taking a quiz or when quiz completed) */}
      {(!activeQuiz || quizSubmitted) && (
        <Card className="rounded-none border border-border bg-card shadow-sm mb-6 font-sans">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="font-serif text-base font-semibold text-foreground flex items-center justify-between">
              <span>Configure Practice Quiz</span>
              <Badge variant="outline" className="rounded-none text-xs">
                AI Grounded Generation
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs font-sans">
              Select your uploaded study material to ensure all quiz questions strictly reflect your course content.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-5">
            {/* Source Mode Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">1. Select Question Source *</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSourceMode("document")}
                  className={`p-3 text-left border rounded-none text-xs transition-colors cursor-pointer ${
                    sourceMode === "document"
                      ? "border-primary bg-primary/5 font-semibold text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" /> Uploaded Study Document
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Grounded strictly in an uploaded lecture slide or notes PDF.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode("multiple")}
                  className={`p-3 text-left border rounded-none text-xs transition-colors cursor-pointer ${
                    sourceMode === "multiple"
                      ? "border-primary bg-primary/5 font-semibold text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" /> Multiple Documents
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Combine concepts across multiple lecture notes or units.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode("general")}
                  className={`p-3 text-left border rounded-none text-xs transition-colors cursor-pointer ${
                    sourceMode === "general"
                      ? "border-primary bg-primary/5 font-semibold text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary" /> General Subject Mode
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Practice general syllabus topics without specific uploaded text.
                  </p>
                </button>
              </div>
            </div>

            {/* Document Picker (if sourceMode === "document") */}
            {sourceMode === "document" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  2. Choose Specific Study Document *
                </Label>

                {loadingDocs ? (
                  <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading documents...
                  </div>
                ) : eligibleDocs.length === 0 ? (
                  <div className="p-4 border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
                    <p>No study materials uploaded yet.</p>
                    <Button asChild size="sm" variant="outline" className="rounded-none text-xs">
                      <Link to="/app/materials">Upload Study Materials</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-56 overflow-y-auto p-1 border border-border">
                    {eligibleDocs.map((doc) => {
                      const isSelected = selectedDocId === doc.id;
                      const isReady = doc.processingStatus === "Ready";

                      return (
                        <div
                          key={doc.id}
                          onClick={() => isReady && handleSelectDoc(doc.id)}
                          className={`p-3 border text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:bg-muted/20"
                          } ${!isReady ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground truncate" title={doc.originalName || doc.fileName}>
                              {doc.originalName || doc.fileName}
                            </p>
                            {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                            <span>{doc.subjectName || "Subject"}</span>
                            <span>•</span>
                            <span>{doc.pageCount || 1} pages/slides</span>
                          </div>

                          <div className="mt-2">
                            {doc.processingStatus === "Ready" ? (
                              <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20 rounded-none text-[10px]">
                                Ready
                              </Badge>
                            ) : doc.processingStatus === "Failed" ? (
                              <Badge variant="destructive" className="rounded-none text-[10px]">
                                Extraction Failed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="rounded-none text-[10px]">
                                Processing...
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Multiple Documents Picker (if sourceMode === "multiple") */}
            {sourceMode === "multiple" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">2. Choose Documents to Combine *</Label>
                <div className="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto p-1 border border-border">
                  {eligibleDocs.map((doc) => {
                    const isSelected = selectedDocIds.has(doc.id);
                    const isReady = doc.processingStatus === "Ready";

                    return (
                      <div
                        key={doc.id}
                        onClick={() => isReady && toggleDocMulti(doc.id)}
                        className={`p-2.5 border flex items-center gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:bg-muted/20"
                        } ${!isReady ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={!isReady}
                          className="rounded-none"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-semibold text-foreground truncate">{doc.originalName || doc.fileName}</p>
                          <p className="text-[11px] text-muted-foreground">{doc.subjectName} • {doc.pageCount || 1} pages</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quiz Parameters */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-border">
              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subject / Course</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="rounded-none text-xs h-9">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {store.subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Questions */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Number of Questions</Label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger className="rounded-none text-xs h-9">
                    <SelectValue placeholder="5 Questions" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="15">15 Questions</SelectItem>
                    <SelectItem value="20">20 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Difficulty Level</Label>
                <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                  <SelectTrigger className="rounded-none text-xs h-9">
                    <SelectValue placeholder="Medium" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="Easy">Easy (Recall & Definitions)</SelectItem>
                    <SelectItem value="Medium">Medium (Application & Concepts)</SelectItem>
                    <SelectItem value="Hard">Hard (Analysis & Complex Scenarios)</SelectItem>
                    <SelectItem value="Mixed">Mixed (Balanced Assessment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Question Type</Label>
                <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)}>
                  <SelectTrigger className="rounded-none text-xs h-9">
                    <SelectValue placeholder="MCQ" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="MCQ">Multiple Choice (4 Options)</SelectItem>
                    <SelectItem value="TrueFalse">True / False</SelectItem>
                    <SelectItem value="Mixed">Mixed (MCQ + True/False)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Questions will be extracted and generated using Gemini based on technical definitions in your document.
              </p>

              <Button
                onClick={handleGenerateQuiz}
                disabled={generating}
                className="rounded-none text-xs px-8 w-full sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Grounded Quiz...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Practice Quiz
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. LOADING STATE */}
      {generating && (
        <Card className="rounded-none border border-border bg-card shadow-sm p-8 text-center font-sans space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="font-serif font-semibold text-base text-foreground">
            Generating Questions from Selected Material...
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Retrieving document chunks, grounding questions in technical definitions, and configuring answer explanations.
          </p>
        </Card>
      )}

      {/* 3. INTERACTIVE QUIZ-TAKING STEPPER (Active Quiz in progress) */}
      {activeQuiz && !quizSubmitted && !generating && currentQuestion && (
        <div className="space-y-6 font-sans">
          {/* Header Bar with Stepper & Progress */}
          <Card className="rounded-none border border-border bg-card shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div>
                  <h3 className="font-serif font-bold text-sm text-foreground">
                    {activeQuiz.title}
                  </h3>
                  <p className="text-muted-foreground mt-0.5">
                    Question {currentQuestionIndex + 1} of {totalQuestions} • {answeredCount} answered
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-none text-xs">
                    {activeQuiz.difficulty} Difficulty
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConfirmSubmitTrigger}
                    className="rounded-none text-xs"
                  >
                    Submit Quiz
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <Progress value={progressPercent} className="h-1.5 rounded-none" />

              {/* Question Number Dots */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {activeQuiz.questions.map((q, qIndex) => {
                  const isCurrent = qIndex === currentQuestionIndex;
                  const isAnswered = Boolean(userAnswers[q.id]);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(qIndex)}
                      className={`h-7 w-7 text-xs font-semibold rounded-none border transition-colors cursor-pointer ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground font-bold"
                          : isAnswered
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      {qIndex + 1}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Current Question Card */}
          <Card className="rounded-none border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-none text-xs bg-primary text-primary-foreground">
                    Question {currentQuestionIndex + 1}
                  </Badge>
                  {currentQuestion.questionType && (
                    <Badge variant="outline" className="rounded-none text-[10px]">
                      {currentQuestion.questionType === "TrueFalse" ? "True / False" : "Multiple Choice"}
                    </Badge>
                  )}
                </div>

                {currentQuestion.sourceCitation && (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Grounded: {currentQuestion.sourceCitation}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <p className="font-serif text-base sm:text-lg font-medium text-foreground leading-relaxed">
                {currentQuestion.question}
              </p>

              {/* Options */}
              {currentQuestion.questionType === "TrueFalse" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {["True", "False"].map((optText, oIdx) => {
                    const optionLetter = oIdx === 0 ? "A" : "B";
                    const isSelected = userAnswers[currentQuestion.id] === optionLetter;

                    return (
                      <button
                        key={optText}
                        type="button"
                        onClick={() => handleSelectAnswer(currentQuestion.id, optionLetter)}
                        className={`p-5 text-left border rounded-none transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-1 ring-primary font-bold text-foreground"
                            : "border-border bg-card hover:bg-muted/20 text-foreground"
                        }`}
                      >
                        <span className="text-sm font-semibold">{optText}</span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "A", text: currentQuestion.optionA },
                    { label: "B", text: currentQuestion.optionB },
                    { label: "C", text: currentQuestion.optionC },
                    { label: "D", text: currentQuestion.optionD },
                  ]
                    .filter((opt) => Boolean(opt.text))
                    .map((opt) => {
                      const isSelected = userAnswers[currentQuestion.id] === opt.label;

                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleSelectAnswer(currentQuestion.id, opt.label)}
                          className={`p-4 text-left border rounded-none transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary font-semibold text-foreground"
                              : "border-border bg-card hover:bg-muted/20 text-foreground"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 text-xs">
                            <span className="font-bold text-primary">{opt.label}.</span>
                            <span className="leading-relaxed">{opt.text}</span>
                          </div>
                          <div
                            className={`h-4 w-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                              isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                            }`}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Navigation Controls */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="rounded-none text-xs"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="rounded-none text-xs"
                  >
                    Next Question <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleConfirmSubmitTrigger}
                    className="rounded-none text-xs px-6"
                  >
                    Submit Final Answers
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. POST-SUBMISSION RESULTS & DETAILED REVIEW */}
      {quizSubmitted && submissionResult && activeQuiz && (
        <div className="space-y-6 font-sans">
          {/* Score Header Card */}
          <Card className="rounded-none border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" /> Quiz Evaluation Results
                </CardTitle>
                <Badge variant="outline" className="rounded-none text-xs">
                  {submissionResult.percentage >= 70 ? "Pass (Proficient)" : "Needs Review"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Metric Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Score</p>
                  <p className="text-2xl font-serif font-bold text-foreground mt-1">
                    {submissionResult.score} / {submissionResult.total}
                  </p>
                </div>

                <div className="p-4 border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Percentage</p>
                  <p className="text-2xl font-serif font-bold text-primary mt-1">
                    {submissionResult.percentage}%
                  </p>
                </div>

                <div className="p-4 border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Correct Answers</p>
                  <p className="text-2xl font-serif font-bold text-emerald-600 mt-1">
                    {submissionResult.score}
                  </p>
                </div>

                <div className="p-4 border border-border bg-muted/10">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Incorrect Answers</p>
                  <p className="text-2xl font-serif font-bold text-destructive mt-1">
                    {submissionResult.total - submissionResult.score}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  onClick={handleRetryQuiz}
                  className="rounded-none text-xs"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retry This Quiz
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveQuiz(null);
                    setQuizSubmitted(false);
                    setSubmissionResult(null);
                  }}
                  className="rounded-none text-xs"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Configure Another Quiz
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-none text-xs">
                  <Link to="/app/assistant">
                    <MessagesSquare className="mr-1.5 h-3.5 w-3.5" /> Ask AI about Incorrect Answers
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Question by Question In-Depth Review */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-base text-foreground">
              Question-by-Question Solution & Grounded Source Review
            </h3>

            {submissionResult.evaluatedQuestions.map((q, idx) => {
              const userAnswer = userAnswers[q.id];
              const correctAnswer = q.correctAnswer;
              const isCorrect = userAnswer && userAnswer.toUpperCase() === correctAnswer.toUpperCase();

              return (
                <Card key={q.id} className="rounded-none border border-border bg-card shadow-sm">
                  <CardContent className="p-5 space-y-4 text-xs font-sans">
                    <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-none text-xs bg-primary text-primary-foreground">
                          Q{idx + 1}
                        </Badge>
                        {isCorrect ? (
                          <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20 rounded-none text-xs">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="rounded-none text-xs">
                            <XCircle className="mr-1 h-3 w-3" /> Incorrect
                          </Badge>
                        )}
                      </div>

                      {q.sourceCitation && (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Source: {q.sourceCitation}
                        </span>
                      )}
                    </div>

                    <p className="font-serif text-sm font-medium text-foreground leading-relaxed">
                      {q.question}
                    </p>

                    {/* Options list showing user selection and correct answer */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { label: "A", text: q.optionA },
                        { label: "B", text: q.optionB },
                        { label: "C", text: q.optionC },
                        { label: "D", text: q.optionD },
                      ]
                        .filter((opt) => Boolean(opt.text))
                        .map((opt) => {
                          const isThisCorrect = opt.label.toUpperCase() === correctAnswer.toUpperCase();
                          const isThisSelected = userAnswer && userAnswer.toUpperCase() === opt.label.toUpperCase();

                          let itemStyle = "border-border bg-card text-foreground";
                          if (isThisCorrect) {
                            itemStyle = "border-emerald-600 bg-emerald-600/10 font-bold text-foreground";
                          } else if (isThisSelected && !isThisCorrect) {
                            itemStyle = "border-destructive bg-destructive/10 text-destructive font-medium";
                          }

                          return (
                            <div
                              key={opt.label}
                              className={`p-3 border rounded-none flex items-center justify-between text-xs ${itemStyle}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{opt.label}.</span>
                                <span>{opt.text}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {isThisSelected && (
                                  <Badge variant="outline" className="rounded-none text-[10px] py-0">
                                    Your choice
                                  </Badge>
                                )}
                                {isThisCorrect && (
                                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Grounded Explanation Box */}
                    <div className="p-3.5 bg-muted/20 border border-border space-y-1">
                      <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Explanation & Grounding:
                      </p>
                      <p className="font-serif text-xs leading-relaxed text-foreground">
                        {q.explanation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL BEFORE FINAL SUBMISSION */}
      <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <DialogContent className="max-w-md rounded-none border border-border bg-card p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" /> Confirm Quiz Submission
            </DialogTitle>
            <DialogDescription className="text-xs font-sans">
              You are about to submit your quiz for automated AI scoring and citation evaluation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-xs space-y-2">
            <p className="text-foreground font-medium">
              You have answered <span className="font-bold text-primary">{answeredCount}</span> of{" "}
              <span className="font-bold">{totalQuestions}</span> questions.
            </p>

            {answeredCount < totalQuestions && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  You have {totalQuestions - answeredCount} unanswered question(s). Unanswered questions will receive 0 marks.
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setSubmitConfirmOpen(false)}
              className="rounded-none text-xs"
            >
              Back to Quiz
            </Button>
            <Button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="rounded-none text-xs px-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Evaluating...
                </>
              ) : (
                "Confirm & Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
