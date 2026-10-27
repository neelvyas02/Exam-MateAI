import { createFileRoute } from "@tanstack/react-router";
import { Copy, ScrollText, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/page-header";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecallStore } from "@/data/recall-store";

export const Route = createFileRoute("/app/summarizer")({
  head: () => ({
    meta: [
      { title: "Notes Summarizer — ExamMate AI" },
      {
        name: "description",
        content: "Turn a long uploaded PDF into a short or detailed AI revision summary.",
      },
      { property: "og:title", content: "Notes Summarizer — ExamMate AI" },
      {
        property: "og:description",
        content: "Turn a long uploaded PDF into a short or detailed AI revision summary.",
      },
    ],
  }),
  component: SummarizerPage,
});

function SummarizerPage() {
  const store = useRecallStore();
  const [doc, setDoc] = useState<string>("");
  const [length, setLength] = useState<"short" | "medium" | "detailed">("short");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string>("");

  const materials = store.materials;
  const selected = materials.find((m) => m.id === doc);

  const handleGenerateSummary = async () => {
    if (!doc) return;
    setLoading(true);
    setReady(false);
    setGeneratedSummary("");

    try {
      if (store.backendAvailable) {
        let numericType: 0 | 1 | 2 = 0;
        if (length === "medium") numericType = 1;
        if (length === "detailed") numericType = 2;

        const summaryObj = await store.summarizeDocumentAsync(doc, numericType);
        setGeneratedSummary(summaryObj.content);
        setReady(true);
        toast.success("AI summary generated successfully.");
      } else {
        setTimeout(() => {
          setGeneratedSummary(
            `Key Points from ${selected?.name || "document"}:\n\n` +
              `1. Fundamental Concepts: Essential theories and architectural principles.\n` +
              `2. Core Methodology: Problem formulation, algorithmic steps, and state space representations.\n` +
              `3. Key Formulas & Definitions: Important definitions and mathematical models.\n` +
              `4. Exam Takeaways: High-yield revision points and expected question patterns.`
          );
          setReady(true);
          toast.info("Generated summary in offline mode.");
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate document summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        icon={ScrollText}
        title="Notes Summarizer"
        description="Pick one of your uploaded documents and generate a revision-ready summary."
      />

      <Card className="rounded-2xl border border-border bg-card shadow-soft">
        <CardContent className="grid gap-4 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="doc" className="text-xs font-semibold">Study material</Label>
            <Select value={doc} onValueChange={setDoc}>
              <SelectTrigger id="doc" className="rounded-none text-xs h-9">
                <SelectValue placeholder="Select an uploaded PDF" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.subject})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Summary length</Label>
            <Tabs value={length} onValueChange={(v) => setLength(v as any)}>
              <TabsList className="rounded-none h-9">
                <TabsTrigger value="short" className="rounded-none text-xs">
                  Short
                </TabsTrigger>
                <TabsTrigger value="detailed" className="rounded-none text-xs">
                  Detailed
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Button
            className="rounded-none h-9 text-xs"
            disabled={!doc || loading}
            onClick={handleGenerateSummary}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {loading ? "Generating…" : "Generate Summary"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardContent className="flex items-center gap-2.5 p-6 text-xs text-muted-foreground font-sans">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            <span>Generating your summary…</span>
          </CardContent>
        </Card>
      ) : ready && selected ? (
        <Card className="animate-fade-in-up rounded-2xl border border-border bg-card shadow-soft">
          <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between gap-3">
            <CardTitle className="truncate font-display text-base font-medium text-foreground">{selected.name}</CardTitle>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="rounded-sm capitalize text-[11px] font-sans">
                {length} summary
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-xs h-7 px-2.5 font-sans"
                onClick={() => {
                  navigator.clipboard.writeText(generatedSummary);
                  toast.success("Summary copied to clipboard");
                }}
              >
                <Copy className="mr-1.5 h-3 w-3" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="max-w-3xl font-serif text-[15px] sm:text-base leading-[1.65] text-foreground/90 whitespace-pre-wrap">
              {generatedSummary}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={ScrollText}
          title="No summary yet"
          description="Select an uploaded PDF and choose a summary length to see the output here."
        />
      )}
    </>
  );
}
