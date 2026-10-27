import { createFileRoute } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRecallStore } from "@/data/recall-store";
import { SearchResultItemDto } from "@/lib/api";

export const Route = createFileRoute("/app/search")({
  head: () => ({
    meta: [
      { title: "Search Documents — ExamMate AI" },
      {
        name: "description",
        content: "Smart search across every uploaded PDF, with document name and page number results.",
      },
      { property: "og:title", content: "Search Documents — ExamMate AI" },
      {
        property: "og:description",
        content: "Smart search across every uploaded PDF, with document name and page number results.",
      },
    ],
  }),
  component: SearchPage,
});

// Placeholder results for fallback offline mode
const placeholderResults: SearchResultItemDto[] = [
  {
    documentId: "d1",
    documentName: "Operating-Systems-Unit-1-to-3.pdf",
    documentType: "StudyMaterial",
    subjectName: "Operating Systems",
    pageNumber: 62,
    topic: "Deadlock avoidance",
    previewText:
      "…the banker's algorithm grants a resource request only if the resulting state is safe, meaning a completion sequence exists for every process…",
  },
  {
    documentId: "d2",
    documentName: "Operating-Systems-Unit-1-to-3.pdf",
    documentType: "StudyMaterial",
    subjectName: "Operating Systems",
    pageNumber: 71,
    topic: "Deadlock detection",
    previewText:
      "…a wait-for graph is maintained and a cycle in the graph indicates that the involved processes are deadlocked…",
  },
  {
    documentId: "d3",
    documentName: "DBMS-Complete-Notes.pdf",
    documentType: "StudyMaterial",
    subjectName: "Database Systems",
    pageNumber: 118,
    topic: "Concurrency control",
    previewText:
      "…deadlocks in transactions are resolved either by wait-die and wound-wait schemes or by periodic detection and victim selection…",
  },
];

function SearchPage() {
  const store = useRecallStore();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItemDto[]>([]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setSubmitted(q);

    try {
      if (store.backendAvailable) {
        const response = await store.searchAsync(q);
        setSearchResults(response.results || []);
        toast.success(`Found ${response.totalMatches || response.results?.length || 0} matches.`);
      } else {
        setTimeout(() => {
          setSearchResults(placeholderResults.filter((r) => r.previewText.toLowerCase().includes(q.toLowerCase()) || r.topic.toLowerCase().includes(q.toLowerCase())));
          toast.info("Showing local search results.");
        }, 600);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search documents.");
      setSearchResults(placeholderResults);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        icon={Search}
        title="Search Documents"
        description="Look inside every uploaded PDF at once and jump straight to the right page."
      />

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-5 sm:p-6">
          <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={handleSearchSubmit}>
            <div className="relative min-w-0">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any topic inside uploaded documents"
                className="h-11 rounded-none pl-10 text-xs sm:text-sm font-sans"
              />
            </div>
            <Button type="submit" className="h-11 shrink-0 rounded-none px-6 text-xs" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Try:</span>
            {["deadlock", "normalization", "semantic analysis"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQuery(t)}
                className="rounded-none border border-border px-2.5 py-1 transition-colors hover:bg-accent hover:text-accent-foreground font-sans cursor-pointer text-xs"
              >
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="rounded-2xl border border-border bg-card shadow-soft">
          <CardContent className="flex items-center gap-2.5 p-6 text-xs text-muted-foreground font-sans">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            <span>Searching your study materials…</span>
          </CardContent>
        </Card>
      ) : submitted ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground font-sans">
            Showing matches for “<span className="font-semibold text-foreground">{submitted}</span>” across your study materials.
          </p>
          {searchResults.length > 0 ? (
            searchResults.map((r, i) => (
              <Card
                key={`${r.documentId}-${r.pageNumber}-${i}`}
                className="animate-fade-in-up rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-0.5 font-sans"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <CardContent className="p-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-secondary" />
                      <p className="truncate text-sm font-medium font-display text-foreground">{r.documentName}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 rounded-sm text-[11px]">
                      Page {r.pageNumber}
                    </Badge>
                  </div>
                  {r.topic && (
                    <Badge variant="outline" className="mt-2.5 rounded-sm text-[11px]">
                      {r.topic}
                    </Badge>
                  )}
                  <p className="mt-3 text-xs sm:text-[13.5px] leading-[1.65] font-serif text-foreground/90">{r.previewText}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl shadow-soft">
              <CardContent className="p-8 text-center text-sm text-muted-foreground font-sans">
                No matching topics or content found for "{submitted}".
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="Search your library"
          description="Enter a topic, definition or keyword to find where it appears across your uploaded PDFs."
        />
      )}
    </>
  );
}
