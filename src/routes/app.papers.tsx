import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, FileSearch, FileStack, FileText, Layers, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/page-header";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { previousPapers as seed } from "@/data/placeholder";

export const Route = createFileRoute("/app/papers")({
  head: () => ({
    meta: [
      { title: "Previous Year Papers — Recall AI" },
      {
        name: "description",
        content: "Upload previous year question papers and run repeated-question analysis on them.",
      },
      { property: "og:title", content: "Previous Year Papers — Recall AI" },
      {
        property: "og:description",
        content: "Upload previous year question papers and run repeated-question analysis on them.",
      },
    ],
  }),
  component: PapersPage,
});

const placeholderPanels = [
  { icon: Repeat, title: "Repeated Questions", text: "Questions that appear across multiple years will be listed here." },
  { icon: FileSearch, title: "Frequently Asked Topics", text: "Topics ranked by how often examiners return to them." },
  { icon: BarChart3, title: "High Weightage Topics", text: "Topics carrying the largest share of total marks." },
  { icon: Layers, title: "Unit-wise Analysis", text: "A per-unit breakdown of questions and marks distribution." },
  { icon: BarChart3, title: "Topic Frequency", text: "How many times each topic was asked, year by year." },
];

function PapersPage() {
  const [papers, setPapers] = useState(seed);
  const [analyzing, setAnalyzing] = useState(false);

  return (
    <>
      <PageHeader
        icon={FileStack}
        title="Previous Year Papers"
        description="Upload past question papers so Recall AI can find patterns across years."
        actions={
          <>
            <Button
              className="rounded-none"
              disabled={analyzing || papers.length === 0}
              onClick={() => {
                setAnalyzing(true);
                setTimeout(() => {
                  setAnalyzing(false);
                  toast.success("Analysis complete", {
                    description: "Question papers processed and indexed.",
                  });
                }, 1400);
              }}
            >
              <FileSearch className="mr-1.5 h-4 w-4" />
              {analyzing ? "Analyzing…" : "Analyze Papers"}
            </Button>
            <Button asChild variant="outline" className="rounded-none">
              <Link to="/app/analysis">Open full analysis</Link>
            </Button>
          </>
        }
      />

      <UploadDropzone
        label="Upload previous year question papers"
        hint="PDF · DOCX · JPG · PNG — Add several years at once to strengthen repetition detection."
      />

      {papers.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No question papers uploaded"
          description="Upload at least two past papers to start detecting repeated questions and topics."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {papers.map((p, i) => (
            <Card
              key={p.id}
              className="animate-fade-in-up rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="p-5 font-sans">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <FileText className="h-5 w-5 text-secondary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-medium text-sm text-foreground">{p.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {p.subject} · {p.year}
                    </p>
                  </div>
                  <Badge
                    variant={p.status === "analyzed" ? "secondary" : "outline"}
                    className="shrink-0 rounded-sm text-[11px]"
                  >
                    {p.status === "analyzed" ? "Analyzed" : "Pending"}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 border border-border px-3.5 py-2.5 text-xs text-muted-foreground">
                  <span>{p.pages} pages</span>
                  <span>Uploaded {p.uploadedAt}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" className="flex-1 rounded-none text-xs">
                    <Link to="/app/analysis">View analysis</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${p.name}`}
                    className="rounded-none text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setPapers((prev) => prev.filter((x) => x.id !== p.id));
                      toast.success("Removed from the list");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-display font-semibold text-lg text-foreground">Analysis Overview</h2>
        <p className="mt-0.5 text-xs font-sans text-muted-foreground">
          These modules update automatically once question paper analysis is complete.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 font-sans">
          {placeholderPanels.map((panel) => (
            <Card key={panel.title} className="rounded-2xl border border-border bg-card shadow-soft">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="flex items-center gap-2 font-display text-sm font-medium text-foreground">
                  <panel.icon className="h-4 w-4 shrink-0 text-secondary" />
                  <span className="truncate">{panel.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground leading-relaxed">{panel.text}</p>
                <div className="mt-4 space-y-2.5">
                  {analyzing ? (
                    <>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-full rounded bg-muted/40" />
                      <div className="h-4 w-5/6 rounded bg-muted/40" />
                      <div className="h-4 w-2/3 rounded bg-muted/40" />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

