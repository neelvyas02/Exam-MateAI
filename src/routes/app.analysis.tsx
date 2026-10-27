import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileSearch,
  Flame,
  Layers,
  Repeat,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecallStore, PYQPaper, PYQQuestion, TopicFrequency } from "@/data/recall-store";
import { UploadDropzone } from "@/components/upload-dropzone";

export const Route = createFileRoute("/app/analysis")({
  head: () => ({
    meta: [
      { title: "PYQ Analyzer — Recall AI" },
      {
        name: "description",
        content: "Analyze previous year question papers, detect repeated questions, topic frequencies, and high-priority exam topics.",
      },
      { property: "og:title", content: "PYQ Analyzer — Recall AI" },
      {
        property: "og:description",
        content: "Analyze previous year question papers, detect repeated questions, topic frequencies, and high-priority exam topics.",
      },
    ],
  }),
  component: AnalysisPage,
});

const chartConfig = {
  count: { label: "Questions Asked", color: "var(--chart-1)" },
  marks: { label: "Total Marks", color: "var(--chart-2)" },
};

export function AnalysisPage() {
  const store = useRecallStore();
  const [selectedTopic, setSelectedTopic] = useState<TopicFrequency | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [confirmPaper, setConfirmPaper] = useState<{
    paper: PYQPaper;
    questions: PYQQuestion[];
    confidence: "high" | "low";
  } | null>(null);

  const handlePYQUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const defaultSubjectId = store.subjects[0]?.id || "00000000-0000-0000-0000-000000000000";

    try {
      if (store.backendAvailable) {
        const uploadedDoc = await store.uploadDocumentAsync(file, defaultSubjectId, "PreviousPaper");
        if (uploadedDoc) {
          toast.success("Previous paper uploaded to backend. Running AI analysis...");
          try {
            await store.analyzePapersAsync([uploadedDoc.id]);
            toast.success("Question paper analysis complete!");
          } catch (analysisErr: any) {
            toast.info("Paper uploaded. Standard processing queued.");
          }
        }
      } else {
        const newPaper: PYQPaper = {
          id: `p_${Date.now()}`,
          name: file.name,
          fileType: file.name.split(".").pop()?.toUpperCase() || "PDF",
          subject: "Artificial Intelligence",
          year: "2025",
          uploadedAt: new Date().toISOString().split("T")[0],
          pages: 4,
          questionsCount: 5,
        };

        const newQs: PYQQuestion[] = [
          {
            id: `q_${Date.now()}_1`,
            text: `Explain semantic analysis and frame representations in Natural Language Processing.`,
            marks: 10,
            type: "Descriptive",
            topic: "Natural Language Processing",
            subtopic: "Semantic Analysis",
            difficulty: "Medium",
            paperId: newPaper.id,
            year: "2025",
            subject: "Artificial Intelligence",
          },
        ];

        setConfirmPaper({
          paper: newPaper,
          questions: newQs,
          confidence: "high",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload question paper");
    } finally {
      setUploadModalOpen(false);
    }
  };

  const handleConfirmSavePYQ = () => {
    if (!confirmPaper) return;
    store.addPaper(confirmPaper.paper, confirmPaper.questions);
    toast.success(`PYQ ${confirmPaper.paper.name} added under ${confirmPaper.paper.subject} (${confirmPaper.paper.year})`);
    setConfirmPaper(null);
  };

  return (
    <>
      <PageHeader
        icon={FileSearch}
        title="PYQ Analyzer"
        description="Structured by Subject → Year → Paper. Detect repeated & similar questions, topic frequencies, and high priority topics."
        actions={
          <Button className="rounded-none" onClick={() => setUploadModalOpen(true)}>
            <UploadCloud className="mr-1.5 h-4 w-4" /> Upload Question Paper
          </Button>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none p-1 bg-muted/40 border border-border font-sans">
          <TabsTrigger value="overview" className="rounded-none text-xs font-sans">
            Overview
          </TabsTrigger>
          <TabsTrigger value="repeated" className="rounded-none text-xs font-sans">
            Repeated Questions ({store.similarGroups.length})
          </TabsTrigger>
          <TabsTrigger value="topics" className="rounded-none text-xs font-sans">
            Frequently Asked Topics
          </TabsTrigger>
          <TabsTrigger value="priority" className="rounded-none text-xs font-sans">
            High Priority / Weightage
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border border-border bg-card shadow-soft">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Papers Analyzed</p>
                <p className="mt-2 text-3xl font-extrabold font-sans text-foreground">{store.papers.length}</p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">across 3 exam years</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card shadow-soft">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Questions Analyzed</p>
                <p className="mt-2 text-3xl font-extrabold font-sans text-foreground">{store.questions.length}</p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">extracted & classified</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card shadow-soft">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Topics Identified</p>
                <p className="mt-2 text-3xl font-extrabold font-sans text-foreground">{store.topicFrequencies.length}</p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">with frequency counts</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border bg-card shadow-soft">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Repeated Question Groups</p>
                <p className="mt-2 text-3xl font-extrabold font-sans text-secondary">{store.similarGroups.length}</p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">semantic match detected</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border border-border bg-card shadow-soft">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-display text-base font-medium flex items-center justify-between">
                <span>PYQs Organized by Subject → Year</span>
                <Badge variant="outline" className="rounded-sm text-xs font-sans">
                  Separated from Study Material
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 font-sans">
              {store.papers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5"
                >
                  <div className="min-w-0">
                    <p className="font-display font-medium text-sm truncate text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.subject} • Year {p.year} • {p.questionsCount} extracted questions
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-sm text-xs shrink-0 font-sans">
                    {p.year} Paper
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPEATED QUESTIONS TAB */}
        <TabsContent value="repeated" className="mt-6">
          <Card className="rounded-2xl border border-border bg-card shadow-soft">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base font-medium text-foreground">
                <Repeat className="h-4 w-4 text-secondary" /> Exact & Semantically Similar Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {store.similarGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <Badge variant="outline" className="rounded-sm text-[11px] font-sans mb-1.5">
                        Topic: {group.topic}
                      </Badge>
                      <h4 className="font-display font-medium text-base text-foreground">
                        "{group.canonicalQuestion}"
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 font-sans">
                      <Badge className="rounded-sm bg-accent text-accent-foreground border-accent/40 text-xs">
                        {group.similarityPercentage}% Calculated Similarity
                      </Badge>
                      <Badge variant="secondary" className="rounded-sm text-xs">
                        {group.occurrencesCount} Occurrences
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 font-sans">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Asked across exam years:
                    </p>
                    <div className="grid gap-2">
                      {group.questions.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between rounded-lg bg-muted/20 border border-border p-3 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-serif text-[13.5px] leading-[1.6] text-foreground/90">{q.text}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-sans">
                            {q.marks && (
                              <Badge variant="outline" className="rounded-sm text-[10px]">
                                {q.marks} Marks
                              </Badge>
                            )}
                            <Badge className="rounded-sm text-[10px] bg-secondary text-secondary-foreground">
                              {q.year}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FREQUENTLY ASKED TOPICS TAB */}
        <TabsContent value="topics" className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border border-border bg-card shadow-soft">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base font-medium text-foreground">
                <BarChart3 className="h-4 w-4 text-secondary" /> Topic Frequency Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <BarChart data={store.topicFrequencies} margin={{ left: -18 }}>
                  <CartesianGrid vertical={false} strokeOpacity={0.25} />
                  <XAxis
                    dataKey="topic"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    interval={0}
                    angle={-15}
                    dy={10}
                    height={50}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="questionCount" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border bg-card shadow-soft">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-display text-base font-medium">Click Topic to Explore Related Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 font-sans">
              {store.topicFrequencies.map((tf) => (
                <div
                  key={tf.topic}
                  className="flex items-center justify-between rounded-xl border border-border p-3.5 hover:bg-accent/40 cursor-pointer transition-colors"
                  onClick={() => setSelectedTopic(tf)}
                >
                  <div>
                    <h4 className="font-display font-medium text-sm text-foreground">{tf.topic}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                      {tf.questionCount} Questions • Asked in {tf.years.join(", ")}
                    </p>
                  </div>
                  <Badge
                    variant={tf.priority === "High" ? "default" : "outline"}
                    className="rounded-sm text-xs font-sans"
                  >
                    {tf.isHighWeightage ? "High Weightage" : `${tf.priority} Priority`}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HIGH PRIORITY / WEIGHTAGE TAB */}
        <TabsContent value="priority" className="mt-6">
          <Card className="rounded-2xl border border-border bg-card shadow-soft">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base font-medium text-foreground">
                <Flame className="h-4 w-4 text-destructive" /> High Priority Focus Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 font-sans">
              {store.topicFrequencies
                .filter((t) => t.priority === "High")
                .map((t) => (
                  <div
                    key={t.topic}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4 shadow-soft"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-medium text-base text-foreground">{t.topic}</h4>
                        <Badge className="rounded-sm bg-destructive/10 text-destructive border-destructive/20 text-xs font-sans">
                          {t.isHighWeightage ? "High Weightage Marks" : "High Priority"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-sans">
                        {t.questionCount} PYQ questions • Total Weightage: {t.totalMarks || "N/A"} marks
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="rounded-none text-xs font-sans">
                        <Link to="/app/materials">Study Material</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="rounded-none text-xs font-sans">
                        <Link to="/app/assistant">Ask AI</Link>
                      </Button>
                      <Button asChild size="sm" className="rounded-none text-xs font-sans">
                        <Link to="/app/quiz">Practice Quiz</Link>
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* TOPIC EXPLORER MODAL */}
      {selectedTopic && (
        <Dialog open={Boolean(selectedTopic)} onOpenChange={() => setSelectedTopic(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 border border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-base font-medium flex items-center justify-between text-foreground">
                <span>{selectedTopic.topic}</span>
                <Badge variant="secondary" className="rounded-sm text-xs font-sans">
                  {selectedTopic.questionCount} Questions
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs font-sans">
              <div>
                <span className="text-muted-foreground font-semibold block">Subject:</span>
                <span className="text-foreground">{selectedTopic.subject}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold block">Years Asked:</span>
                <span className="text-foreground">{selectedTopic.years.join(", ")}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold block">Priority Status:</span>
                <span className="font-bold text-secondary">
                  {selectedTopic.isHighWeightage ? "High Weightage" : selectedTopic.priority}
                </span>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button variant="outline" className="rounded-none text-xs" onClick={() => setSelectedTopic(null)}>
                  Close
                </Button>
                <Button asChild className="rounded-none text-xs">
                  <Link to="/app/quiz">Quiz On Topic</Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* UPLOAD PYQ DIALOG */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 border border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-medium text-foreground">
              Upload Previous Year Question Paper
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <UploadDropzone
              label="Drop Question Paper file"
              hint="PDF · DOCX · JPG · PNG supported"
              onFiles={handlePYQUpload}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION PYQ DIALOG */}
      {confirmPaper && (
        <Dialog open={Boolean(confirmPaper)} onOpenChange={() => setConfirmPaper(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 border border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-base font-medium flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-secondary" /> PYQ Auto-Detection Confirmation
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs font-sans">
              {confirmPaper.confidence === "low" && (
                <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 text-warning-foreground">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Low Confidence Detection
                  </p>
                  <p className="mt-1">Please confirm or edit the Subject & Exam Year below.</p>
                </div>
              )}

              <div>
                <Label className="text-xs">Paper Name</Label>
                <Input
                  value={confirmPaper.paper.name}
                  onChange={(e) =>
                    setConfirmPaper({
                      ...confirmPaper,
                      paper: { ...confirmPaper.paper, name: e.target.value },
                    })
                  }
                  className="rounded-md text-xs h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Subject</Label>
                <Input
                  value={confirmPaper.paper.subject}
                  onChange={(e) =>
                    setConfirmPaper({
                      ...confirmPaper,
                      paper: { ...confirmPaper.paper, subject: e.target.value },
                    })
                  }
                  className="rounded-md text-xs h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Exam Year</Label>
                <Input
                  value={confirmPaper.paper.year}
                  onChange={(e) =>
                    setConfirmPaper({
                      ...confirmPaper,
                      paper: { ...confirmPaper.paper, year: e.target.value },
                    })
                  }
                  className="rounded-md text-xs h-9 mt-1"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button variant="outline" className="rounded-none text-xs" onClick={() => setConfirmPaper(null)}>
                  Cancel
                </Button>
                <Button className="rounded-none text-xs" onClick={handleConfirmSavePYQ}>
                  Confirm & Analyze Questions
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}


