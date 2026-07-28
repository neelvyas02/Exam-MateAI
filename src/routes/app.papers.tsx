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
      { title: "Previous Year Papers — ExamMate AI" },
      {
        name: "description",
        content: "Upload previous year question papers and run repeated-question analysis on them.",
      },
      { property: "og:title", content: "Previous Year Papers — ExamMate AI" },
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
        description="Upload past question papers so ExamMate AI can find patterns across years."
        actions={
          <>
            <Button
              className="rounded-xl"
              disabled={analyzing || papers.length === 0}
              onClick={() => {
                setAnalyzing(true);
                setTimeout(() => {
                  setAnalyzing(false);
                  toast.success("Analysis placeholder ready", {
                    description: "Connect a backend to populate real results.",
                  });
                }, 1400);
              }}
            >
              <FileSearch className="mr-1.5 h-4 w-4" />
              {analyzing ? "Analyzing…" : "Analyze Papers"}
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/app/analysis">Open full analysis</Link>
            </Button>
          </>
        }
      />

      <UploadDropzone
        label="Upload previous year question papers"
        hint="Add several years at once — the more papers, the stronger the repetition signal."
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
              className="animate-rise rounded-2xl shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {p.subject} · {p.year}
                    </p>
                  </div>
                  <Badge
                    variant={p.status === "analyzed" ? "secondary" : "outline"}
                    className="shrink-0 rounded-full text-[11px]"
                  >
                    {p.status === "analyzed" ? "Analyzed" : "Pending"}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
                  <span>{p.pages} pages</span>
                  <span>Uploaded {p.uploadedAt}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" className="flex-1 rounded-xl">
                    <Link to="/app/analysis">View analysis</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${p.name}`}
                    className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
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
        <h2 className="text-lg font-semibold">Analysis output</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These panels fill in once paper analysis is connected to a backend.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {placeholderPanels.map((panel) => (
            <Card key={panel.title} className="rounded-2xl shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <panel.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{panel.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{panel.text}</p>
                <div className="mt-4 space-y-2.5">
                  {analyzing ? (
                    <>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-full rounded bg-muted/70" />
                      <div className="h-4 w-5/6 rounded bg-muted/70" />
                      <div className="h-4 w-2/3 rounded bg-muted/70" />
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
