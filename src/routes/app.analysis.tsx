import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  Flame,
  Layers,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Repeat,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadDropzone } from "@/components/upload-dropzone";
import { useRecallStore, PYQPaper, PYQQuestion, TopicFrequency } from "@/data/recall-store";
import { analysisApi, documentsApi, DocumentDto } from "@/lib/api";

export const Route = createFileRoute("/app/analysis")({
  head: () => ({
    meta: [
      { title: "PYQ Analyzer — ExamMateAI" },
      {
        name: "description",
        content: "Analyze previous year question papers, extract exam questions, detect repeated topics, and prioritize high-weightage revisions.",
      },
    ],
  }),
  component: AnalysisPage,
});

export function AnalysisPage() {
  const store = useRecallStore();

  // Subject and papers state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [paperDocs, setPaperDocs] = useState<DocumentDto[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [loadingPapers, setLoadingPapers] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState<string>("");
  const [uploadYear, setUploadYear] = useState<string>(new Date().getFullYear().toString());
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Load user papers from backend
  const loadPapers = async () => {
    setLoadingPapers(true);
    try {
      if (store.backendAvailable) {
        const allDocs = await documentsApi.getUserDocuments();
        const papersOnly = allDocs.filter(
          (d) => d.documentType === "PreviousPaper" || d.documentType === "1"
        );
        setPaperDocs(papersOnly);

        // Pre-select ready papers if none selected yet
        if (selectedDocIds.size === 0 && papersOnly.length > 0) {
          const readyIds = papersOnly.filter((p) => p.processingStatus === "Ready").map((p) => p.id);
          setSelectedDocIds(new Set(readyIds));
        }

        // Try to fetch latest analysis
        try {
          const latest = await analysisApi.getLatestAnalysis(
            selectedSubjectId !== "all" ? selectedSubjectId : undefined
          );
          if (latest && latest.analysis && !store.currentAnalysis) {
            store.setCurrentAnalysis(latest.analysis);
          }
        } catch {}
      }
    } catch (err: any) {
      console.warn("Could not load documents from backend:", err);
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    loadPapers();
  }, [store.backendAvailable]);

  // Smart polling: Automatically poll while any paper is Processing/Uploaded, and stop once Ready/Failed
  useEffect(() => {
    const hasPending = paperDocs.some(
      (p) => p.processingStatus === "Processing" || p.processingStatus === "Uploaded"
    );
    if (!hasPending) return;

    let pollCount = 0;
    const maxPolls = 30; // Max 60 seconds

    const timer = setInterval(async () => {
      pollCount++;
      await loadPapers();
      if (pollCount >= maxPolls) {
        clearInterval(timer);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [paperDocs]);

  // Set default subject for upload modal
  useEffect(() => {
    if (store.subjects.length > 0 && !uploadSubjectId) {
      setUploadSubjectId(store.subjects[0].id);
    }
  }, [store.subjects, uploadSubjectId]);

  // Filter papers by selected subject
  const filteredPapers = useMemo(() => {
    if (selectedSubjectId === "all") return paperDocs;
    return paperDocs.filter((p) => p.subjectId === selectedSubjectId);
  }, [paperDocs, selectedSubjectId]);

  // Toggle selection for a paper
  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select / Deselect all
  const toggleSelectAll = () => {
    if (selectedDocIds.size === filteredPapers.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredPapers.map((p) => p.id)));
    }
  };

  // Delete paper
  const handleDeletePaper = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await documentsApi.deleteDocument(id);
      toast.success(`Removed paper: ${name}`);
      setPaperDocs((prev) => prev.filter((p) => p.id !== id));
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove document");
    }
  };

  // Upload handler
  const handleUploadPaper = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please drop or select a question paper file to upload.");
      return;
    }
    if (!uploadSubjectId) {
      toast.error("Please select a subject for this question paper.");
      return;
    }

    setUploading(true);
    const file = uploadedFiles[0];
    try {
      const uploadedDoc = await store.uploadDocumentAsync(
        file,
        uploadSubjectId,
        null,
        "PreviousPaper"
      );

      if (uploadedDoc) {
        toast.success(`Uploaded "${file.name}" successfully! Processing text extraction...`);
        setUploadedFiles([]);
        setUploadModalOpen(false);
        await loadPapers();

        // Auto select uploaded doc
        setSelectedDocIds((prev) => new Set([...prev, uploadedDoc.id]));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload question paper");
    } finally {
      setUploading(false);
    }
  };

  // Run PYQ Analysis
  const handleRunAnalysis = async () => {
    const selectedIds = Array.from(selectedDocIds);
    if (selectedIds.length === 0) {
      toast.error("Please select at least one question paper to analyze.");
      return;
    }

    // Verify selected documents are ready
    const notReady = paperDocs.filter(
      (p) => selectedIds.includes(p.id) && p.processingStatus !== "Ready"
    );
    if (notReady.length > 0) {
      toast.error(
        `Document "${notReady[0].originalName || notReady[0].fileName}" is still processing. Please wait until its status is Ready.`
      );
      return;
    }

    setAnalyzing(true);
    try {
      const subjectParam = selectedSubjectId !== "all" ? selectedSubjectId : undefined;
      const result = await store.analyzePapersAsync(selectedIds, subjectParam);
      toast.success("PYQ Analysis completed successfully!");
      if (result.analysis) {
        setActiveTab("overview");
      }
    } catch (err: any) {
      toast.error(err.message || "Question paper analysis failed. Please verify AI configuration.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const analysis = store.currentAnalysis;
    if (!analysis || !analysis.topicFrequency || analysis.topicFrequency.length === 0) {
      toast.info("No analysis data available to export yet.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Topic,Count,Total Marks,Priority,Rationale,Source Papers\n";

    analysis.topicFrequency.forEach((tf) => {
      const papersJoined = (tf.papers || []).join("; ").replace(/,/g, " ");
      const rationaleClean = (tf.rationale || "").replace(/,/g, " ");
      csvContent += `Topic Frequency,"${tf.topic}",${tf.count},"${tf.totalMarks}","${tf.priority}","${rationaleClean}","${papersJoined}"\n`;
    });

    if (analysis.repeatedQuestions) {
      analysis.repeatedQuestions.forEach((rq) => {
        const canonicalClean = rq.canonicalQuestion.replace(/"/g, '""');
        const occs = rq.occurrences
          .map((o) => `${o.paperName} (${o.year} - ${o.questionNumber})`)
          .join("; ");
        csvContent += `Repeated Question,"${canonicalClean}",${rq.occurrencesCount},"${rq.marks}","${rq.similarityPercentage}%","${rq.topic}","${occs}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ExamMateAI_PYQ_Analysis_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported PYQ Analysis as CSV!");
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Derived analysis data
  const analysis = store.currentAnalysis;

  // Chart data
  const chartData = useMemo(() => {
    if (!analysis?.topicFrequency || analysis.topicFrequency.length === 0) {
      return store.topicFrequencies.map((tf) => ({
        topic: tf.topic,
        count: tf.questionCount,
        marks: tf.totalMarks,
      }));
    }
    return analysis.topicFrequency.map((tf) => ({
      topic: tf.topic.length > 20 ? tf.topic.substring(0, 18) + "..." : tf.topic,
      fullTopic: tf.topic,
      count: tf.count,
      marks: typeof tf.totalMarks === "number" ? tf.totalMarks : tf.count * 10,
    }));
  }, [analysis, store.topicFrequencies]);

  const summary = useMemo(() => {
    if (analysis?.summary) {
      return {
        papers: analysis.summary.papersProcessed,
        questions: analysis.summary.totalQuestions,
        topics: analysis.summary.topicsIdentified,
        repeated: analysis.summary.repeatedCount || analysis.repeatedQuestions?.length || 0,
      };
    }
    return {
      papers: store.papers.length,
      questions: store.questions.length,
      topics: store.topicFrequencies.length,
      repeated: store.similarGroups.length,
    };
  }, [analysis, store.papers, store.questions, store.topicFrequencies, store.similarGroups]);

  return (
    <>
      <PageHeader
        icon={FileSearch}
        title="Previous Year Question (PYQ) Analysis"
        description="Extract real questions, detect repeated patterns across exam papers, map topic weightages, and guide your revision."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!analysis}
              className="rounded-none text-xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!analysis}
              className="rounded-none text-xs hidden sm:inline-flex"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Report
            </Button>
            <Button
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              className="rounded-none text-xs"
            >
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Upload Question Paper
            </Button>
          </div>
        }
      />

      {/* PAPER SELECTION & SOURCE CONTROL BAR */}
      <Card className="rounded-none border border-border bg-card shadow-sm mb-6">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="font-serif text-base font-semibold text-foreground">
                Step 1: Select Question Papers for Analysis
              </CardTitle>
              <CardDescription className="text-xs font-sans mt-0.5">
                Pick uploaded exam papers to extract and correlate examination trends.
              </CardDescription>
            </div>

            {/* Subject Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap font-sans">
                Filter Subject:
              </span>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="w-[200px] h-8 text-xs rounded-none">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="all">All Subjects</SelectItem>
                  {store.subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 font-sans space-y-4">
          {loadingPapers ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading uploaded question papers...
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="p-6 border border-dashed border-border text-center space-y-2">
              <FileSearch className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-serif font-medium text-foreground">No Question Papers Found</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No previous year papers uploaded for this subject yet. Upload question papers (PDF, DOCX, TXT)
                to start extracting recurring questions and topic weights.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadModalOpen(true)}
                className="rounded-none text-xs mt-2"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Upload First Question Paper
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      selectedDocIds.size > 0 && selectedDocIds.size === filteredPapers.length
                    }
                    onCheckedChange={toggleSelectAll}
                    className="rounded-none"
                  />
                  <label htmlFor="select-all" className="cursor-pointer font-medium">
                    Select All ({filteredPapers.length} papers)
                  </label>
                </div>
                <span>
                  {selectedDocIds.size} of {filteredPapers.length} selected
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPapers.map((paper) => {
                  const isSelected = selectedDocIds.has(paper.id);
                  const isReady = paper.processingStatus === "Ready";

                  return (
                    <div
                      key={paper.id}
                      onClick={() => isReady && toggleDocSelection(paper.id)}
                      className={`relative flex items-start gap-3 p-3 border transition-colors cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/30"
                      } ${!isReady ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={!isReady}
                        onCheckedChange={() => isReady && toggleDocSelection(paper.id)}
                        className="rounded-none mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate" title={paper.originalName || paper.fileName}>
                          {paper.originalName || paper.fileName}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="rounded-none px-1 py-0 text-[10px]">
                            {paper.fileName.split(".").pop()?.toUpperCase() || "PDF"}
                          </Badge>
                          <span>•</span>
                          <span>{paper.subjectName || "Subject"}</span>
                          <span>•</span>
                          <span>{paper.pageCount || 1} pages</span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                          {paper.processingStatus === "Ready" ? (
                            <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20 rounded-none text-[10px]">
                              <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> Ready for Analysis
                            </Badge>
                          ) : paper.processingStatus === "Failed" ? (
                            <Badge variant="destructive" className="rounded-none text-[10px]">
                              <AlertCircle className="mr-1 h-2.5 w-2.5" /> Processing Failed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="rounded-none text-[10px]">
                              <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" /> Processing
                            </Badge>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePaper(paper.id, paper.originalName || paper.fileName);
                            }}
                            title="Delete paper"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {selectedDocIds.size === 0
                    ? "Select at least 1 paper above to begin extraction."
                    : `${selectedDocIds.size} paper(s) selected for cross-paper analysis.`}
                </p>

                <Button
                  onClick={handleRunAnalysis}
                  disabled={selectedDocIds.size === 0 || analyzing}
                  className="rounded-none text-xs w-full sm:w-auto px-6"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Questions & Topics...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze {selectedDocIds.size > 0 ? selectedDocIds.size : ""} Selected Paper(s)
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* DASHBOARD & OUTPUT TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none p-1 bg-muted/40 border border-border font-sans">
          <TabsTrigger value="overview" className="rounded-none text-xs font-sans">
            Overview
          </TabsTrigger>
          <TabsTrigger value="topics" className="rounded-none text-xs font-sans">
            Frequently Asked Topics ({analysis?.topicFrequency?.length || store.topicFrequencies.length})
          </TabsTrigger>
          <TabsTrigger value="repeated" className="rounded-none text-xs font-sans">
            Repeated Questions ({analysis?.repeatedQuestions?.length || store.similarGroups.length})
          </TabsTrigger>
          <TabsTrigger value="papers" className="rounded-none text-xs font-sans">
            Paper-wise Breakdown ({analysis?.papers?.length || store.papers.length})
          </TabsTrigger>
          <TabsTrigger value="priority" className="rounded-none text-xs font-sans">
            Revision Plan & High Priority
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-none border border-border bg-card shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">
                  Papers Analyzed
                </p>
                <p className="mt-2 text-3xl font-serif font-bold text-foreground">
                  {summary.papers}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">
                  from uploaded source documents
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border border-border bg-card shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">
                  Questions Extracted
                </p>
                <p className="mt-2 text-3xl font-serif font-bold text-foreground">
                  {summary.questions}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">
                  classified by marks & section
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border border-border bg-card shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">
                  Topics Identified
                </p>
                <p className="mt-2 text-3xl font-serif font-bold text-foreground">
                  {summary.topics}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">
                  with observed repetition frequencies
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border border-border bg-card shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">
                  Repeated Question Groups
                </p>
                <p className="mt-2 text-3xl font-serif font-bold text-primary">
                  {summary.repeated}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-sans">
                  exact or semantic repeats detected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Summary Highlights */}
          {analysis && (
            <Card className="rounded-none border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="font-serif text-base font-semibold text-foreground flex items-center justify-between">
                  <span>AI Examination Insights & Findings</span>
                  <Badge variant="outline" className="rounded-none text-xs">
                    Evidence Grounded
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 font-sans space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border border-border bg-muted/10 space-y-2">
                    <h4 className="font-serif font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-primary" /> Top Weightage Topics
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Based on actual questions extracted across all selected papers:
                    </p>
                    <ul className="text-xs space-y-1.5 list-disc list-inside text-foreground">
                      {analysis.topicFrequency.slice(0, 4).map((tf) => (
                        <li key={tf.topic}>
                          <span className="font-medium">{tf.topic}</span>: appeared in {tf.count} question(s)
                          {tf.totalMarks !== "Not specified" ? ` (~${tf.totalMarks} marks)` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 border border-border bg-muted/10 space-y-2">
                    <h4 className="font-serif font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <Repeat className="h-4 w-4 text-secondary" /> Key Recurring Patterns
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Questions identified as repeated or conceptually similar:
                    </p>
                    <ul className="text-xs space-y-1.5 list-disc list-inside text-foreground">
                      {analysis.repeatedQuestions.slice(0, 3).map((rq) => (
                        <li key={rq.canonicalQuestion} className="truncate" title={rq.canonicalQuestion}>
                          <span className="font-medium">{rq.topic}</span>: "{rq.canonicalQuestion}" ({rq.occurrencesCount} occurrences, {rq.similarityPercentage}% similarity)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Source Papers Table */}
          <Card className="rounded-none border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-serif text-base font-semibold text-foreground flex items-center justify-between">
                <span>Analyzed Examination Papers</span>
                <Badge variant="outline" className="rounded-none text-xs font-sans">
                  Source Traceability
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 font-sans">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Paper Name</TableHead>
                    <TableHead className="text-xs font-semibold">Exam Year</TableHead>
                    <TableHead className="text-xs font-semibold">Questions Extracted</TableHead>
                    <TableHead className="text-xs font-semibold">Total Marks</TableHead>
                    <TableHead className="text-xs font-semibold">Key Topics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis?.papers && analysis.papers.length > 0 ? (
                    analysis.papers.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-medium text-foreground">
                          {p.paperName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.year || "Not specified"}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-semibold">
                          {p.questionsCount || p.questions?.length || 0}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.totalMarks !== undefined ? String(p.totalMarks) : "Not specified"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1">
                            {p.topics?.slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="rounded-none text-[10px] py-0">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    store.papers.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-medium text-foreground">{p.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.year || "Not specified"}</TableCell>
                        <TableCell className="text-xs text-foreground font-semibold">{p.questionsCount}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">Not specified</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.subject}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. FREQUENTLY ASKED TOPICS TAB */}
        <TabsContent value="topics" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Chart */}
            <Card className="rounded-none border border-border bg-card shadow-sm lg:col-span-3">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Topic Frequency Distribution
                </CardTitle>
                <CardDescription className="text-xs font-sans">
                  Occurrence frequency of topics across all analyzed examination papers.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="topic"
                        fontSize={11}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        tickLine={false}
                      />
                      <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border p-2.5 shadow-md text-xs font-sans">
                                <p className="font-semibold text-foreground">{data.fullTopic || data.topic}</p>
                                <p className="text-primary mt-1">Questions Asked: {data.count}</p>
                                <p className="text-muted-foreground">Marks: {data.marks}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" fill="var(--color-count, #C85A32)" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Priority Summary */}
            <Card className="rounded-none border border-border bg-card shadow-sm lg:col-span-2">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="font-serif text-base font-semibold text-foreground">
                  Topic Priority Rationale
                </CardTitle>
                <CardDescription className="text-xs font-sans">
                  Prioritized by recurrence frequency and exam marks weightage.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 font-sans max-h-80 overflow-y-auto">
                {(analysis?.topicFrequency || store.topicFrequencies).map((tf: any) => (
                  <div key={tf.topic} className="p-3 border border-border bg-muted/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-xs text-foreground">{tf.topic}</h4>
                      <Badge
                        variant={tf.priority === "High" ? "default" : "outline"}
                        className="rounded-none text-[10px]"
                      >
                        {tf.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Asked in {tf.count} question(s) • Total marks: {tf.totalMarks ?? "Not specified"}
                    </p>
                    {tf.rationale && (
                      <p className="text-[11px] text-foreground/80 italic mt-0.5">
                        "{tf.rationale}"
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Topic Frequency Table */}
          <Card className="rounded-none border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-serif text-base font-semibold text-foreground">
                Comprehensive Topic Repetition Table
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 font-sans">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Topic</TableHead>
                    <TableHead className="text-xs font-semibold">Frequency (Count)</TableHead>
                    <TableHead className="text-xs font-semibold">Estimated Marks</TableHead>
                    <TableHead className="text-xs font-semibold">Observed in Papers</TableHead>
                    <TableHead className="text-xs font-semibold">Priority Level</TableHead>
                    <TableHead className="text-xs font-semibold">Rationale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analysis?.topicFrequency || store.topicFrequencies).map((tf: any) => (
                    <TableRow key={tf.topic}>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {tf.topic}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-primary">
                        {tf.count || tf.questionCount}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tf.totalMarks !== undefined ? String(tf.totalMarks) : "Not specified"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(tf.papers && tf.papers.join(", ")) || (tf.years && tf.years.join(", ")) || "Extracted Papers"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant={tf.priority === "High" ? "default" : "outline"}
                          className="rounded-none text-[10px]"
                        >
                          {tf.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs">
                        {tf.rationale || "Calculated from uploaded question papers."}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. REPEATED QUESTIONS TAB */}
        <TabsContent value="repeated" className="mt-6">
          <Card className="rounded-none border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" /> Repeated & Semantically Similar Questions
              </CardTitle>
              <CardDescription className="text-xs font-sans">
                Grouped without silently discarding meaningful variations. Shows similarity confidence and source paper citations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 font-sans">
              {(analysis?.repeatedQuestions && analysis.repeatedQuestions.length > 0) ? (
                analysis.repeatedQuestions.map((rq, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-border bg-card shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="outline" className="rounded-none text-[10px]">
                            Topic: {rq.topic}
                          </Badge>
                          {rq.marks !== "Not specified" && (
                            <Badge variant="outline" className="rounded-none text-[10px]">
                              {rq.marks} Marks
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-serif font-medium text-sm text-foreground">
                          "{rq.canonicalQuestion}"
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="rounded-none bg-primary/10 text-primary border-primary/20 text-xs">
                          {rq.similarityPercentage}% Similarity Match
                        </Badge>
                        <Badge variant="secondary" className="rounded-none text-xs">
                          {rq.occurrencesCount} Occurrences
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Source Occurrences across Papers:
                      </p>
                      <div className="grid gap-2">
                        {rq.occurrences.map((occ, oIdx) => (
                          <div
                            key={oIdx}
                            className="flex items-center justify-between p-2.5 bg-muted/20 border border-border text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium text-foreground">{occ.paperName}</span>
                              <span className="text-muted-foreground">({occ.year || "Year not specified"})</span>
                              {occ.questionNumber && (
                                <Badge variant="outline" className="rounded-none text-[10px]">
                                  {occ.questionNumber}
                                </Badge>
                              )}
                            </div>

                            <Badge
                              variant={occ.exactMatch ? "default" : "secondary"}
                              className="rounded-none text-[10px]"
                            >
                              {occ.exactMatch ? "Exact Repeat" : `${occ.similarityScore || 85}% Semantic Match`}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : store.similarGroups.length > 0 ? (
                store.similarGroups.map((group) => (
                  <div key={group.id} className="p-4 border border-border bg-card shadow-sm space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                      <div>
                        <Badge variant="outline" className="rounded-none text-[10px] mb-1.5">
                          Topic: {group.topic}
                        </Badge>
                        <h4 className="font-serif font-medium text-sm text-foreground">
                          "{group.canonicalQuestion}"
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-none bg-primary/10 text-primary border-primary/20 text-xs">
                          {group.similarityPercentage}% Similarity
                        </Badge>
                        <Badge variant="secondary" className="rounded-none text-xs">
                          {group.occurrencesCount} Occurrences
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Asked in exam papers:
                      </p>
                      <div className="grid gap-2">
                        {group.questions.map((q) => (
                          <div key={q.id} className="flex items-center justify-between p-2.5 bg-muted/20 border border-border text-xs">
                            <span className="font-serif text-foreground/90">{q.text}</span>
                            <Badge className="rounded-none text-[10px] bg-secondary text-secondary-foreground">
                              {q.year}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No repeated questions detected yet. Run analysis on multiple question papers.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. PAPER-WISE BREAKDOWN TAB */}
        <TabsContent value="papers" className="mt-6 space-y-4">
          {analysis?.papers && analysis.papers.length > 0 ? (
            analysis.papers.map((paper, pIdx) => (
              <Card key={pIdx} className="rounded-none border border-border bg-card shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <CardTitle className="font-serif text-base font-semibold text-foreground">
                        {paper.paperName}
                      </CardTitle>
                      <CardDescription className="text-xs font-sans mt-0.5">
                        Exam Year: <span className="font-semibold">{paper.year || "Not specified"}</span> • Total Marks: <span className="font-semibold">{paper.totalMarks ?? "Not specified"}</span> • Extracted Questions: <span className="font-semibold">{paper.questions?.length || 0}</span>
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {paper.topics?.map((topic) => (
                        <Badge key={topic} variant="outline" className="rounded-none text-[10px]">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 font-sans">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-xs font-semibold">Q #</TableHead>
                        <TableHead className="text-xs font-semibold">Question Text</TableHead>
                        <TableHead className="w-24 text-xs font-semibold">Section</TableHead>
                        <TableHead className="w-20 text-xs font-semibold">Marks</TableHead>
                        <TableHead className="w-36 text-xs font-semibold">Topic</TableHead>
                        <TableHead className="w-24 text-xs font-semibold">Difficulty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paper.questions?.map((q, qIdx) => (
                        <TableRow key={qIdx}>
                          <TableCell className="text-xs font-bold text-primary">
                            {q.number || `Q${qIdx + 1}`}
                          </TableCell>
                          <TableCell className="text-xs font-serif leading-relaxed text-foreground">
                            {q.text}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {q.section || "—"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {q.marks !== undefined ? String(q.marks) : "Not specified"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="rounded-none text-[10px]">
                              {q.topic}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="rounded-none text-[10px]">
                              {q.difficulty || "Medium"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-none border border-border bg-card shadow-sm p-6 text-center text-xs text-muted-foreground">
              Run PYQ analysis to view individual extracted questions, question numbers, marks, and section mappings.
            </Card>
          )}
        </TabsContent>

        {/* 5. REVISION PLAN & HIGH PRIORITY TAB */}
        <TabsContent value="priority" className="mt-6 space-y-6">
          {/* Important Topics Prioritized */}
          <Card className="rounded-none border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" /> High Priority Exam Topics
              </CardTitle>
              <CardDescription className="text-xs font-sans">
                Prioritized according to observed frequency and marks weightage from the uploaded question papers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 font-sans">
              {(analysis?.importantTopics && analysis.importantTopics.length > 0) ? (
                analysis.importantTopics.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-border bg-muted/10 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-foreground">
                          {idx + 1}. {item.topic}
                        </span>
                        <Badge
                          variant={item.importanceLevel === "High" ? "default" : "outline"}
                          className="rounded-none text-[10px]"
                        >
                          {item.importanceLevel} Priority
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Appeared {item.frequency} times</span>
                        {item.totalMarks !== "Not specified" && (
                          <span>• Total: {item.totalMarks} marks</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Basis of Prioritization:
                      </p>
                      <ul className="text-xs list-disc list-inside text-foreground/90 space-y-0.5">
                        {item.reasons.map((reason, rIdx) => (
                          <li key={rIdx}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button asChild variant="outline" size="sm" className="rounded-none text-xs h-7">
                        <Link to="/app/materials">Review Study Notes</Link>
                      </Button>
                      <Button asChild size="sm" className="rounded-none text-xs h-7">
                        <Link to="/app/quiz">Practice Quiz</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                store.topicFrequencies
                  .filter((t) => t.priority === "High")
                  .map((t, idx) => (
                    <div key={idx} className="p-4 border border-border bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-sm text-foreground">{t.topic}</span>
                        <Badge className="rounded-none text-[10px]">High Priority</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.questionCount} questions asked • {t.totalMarks} marks total
                      </p>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Recommended Revision Plan */}
          <Card className="rounded-none border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-600" /> Evidence-Based Revision Roadmap
              </CardTitle>
              <CardDescription className="text-xs font-sans">
                Suggested chronological study order based on actual exam paper evidence.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 font-sans">
              {(analysis?.revisionPlan && analysis.revisionPlan.length > 0) ? (
                analysis.revisionPlan.map((step) => (
                  <div
                    key={step.step}
                    className="p-3.5 border border-border bg-card flex items-start gap-3"
                  >
                    <div className="h-7 w-7 rounded-none bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
                      {step.step}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-serif font-bold text-sm text-foreground">
                          {step.topic}
                        </h4>
                        <Badge
                          variant={step.priority === "High" ? "default" : "outline"}
                          className="rounded-none text-[10px]"
                        >
                          {step.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground/90">{step.suggestedAction}</p>
                      <p className="text-[11px] text-muted-foreground italic">
                        Rationale: {step.rationale}
                      </p>
                      {step.paperReferences && step.paperReferences.length > 0 && (
                        <p className="text-[10px] text-muted-foreground pt-1">
                          Source Papers: {step.paperReferences.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Run PYQ analysis to generate a personalized step-by-step revision sequence.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* UPLOAD PYQ PAPER MODAL */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md rounded-none border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-base font-semibold text-foreground">
              Upload Previous Year Question Paper
            </DialogTitle>
            <DialogDescription className="text-xs font-sans">
              Upload university or college exam papers separately from study notes for dedicated question extraction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 font-sans text-xs">
            {/* Subject Select */}
            <div>
              <Label className="text-xs font-semibold">Subject / Course *</Label>
              <Select value={uploadSubjectId} onValueChange={setUploadSubjectId}>
                <SelectTrigger className="w-full h-9 rounded-none text-xs mt-1">
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

            {/* Exam Year Input */}
            <div>
              <Label className="text-xs font-semibold">Examination Year (Optional)</Label>
              <Input
                value={uploadYear}
                onChange={(e) => setUploadYear(e.target.value)}
                placeholder="e.g. 2024 (or leave blank if unknown)"
                className="rounded-none h-9 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                If omitted or not in the document, it will be marked as "Not specified".
              </p>
            </div>

            {/* Dropzone */}
            <div>
              <Label className="text-xs font-semibold">Question Paper File *</Label>
              <div className="mt-1">
                <UploadDropzone
                  label="Drop Question Paper file here"
                  hint="PDF, DOCX, TXT supported"
                  onFiles={(files) => setUploadedFiles(files)}
                />
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-2 flex items-center justify-between p-2 bg-muted/20 border border-border text-xs">
                  <span className="font-medium text-foreground truncate">{uploadedFiles[0].name}</span>
                  <Badge variant="outline" className="rounded-none text-[10px]">
                    {(uploadedFiles[0].size / (1024 * 1024)).toFixed(2)} MB
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setUploadModalOpen(false);
                setUploadedFiles([]);
              }}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadPaper}
              disabled={uploadedFiles.length === 0 || uploading}
              className="rounded-none text-xs"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Uploading...
                </>
              ) : (
                "Upload & Register Paper"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
