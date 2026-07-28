import { createFileRoute } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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

// Placeholder results for UI demonstration only.
const placeholderResults = [
  {
    doc: "Operating-Systems-Unit-1-to-3.pdf",
    page: 62,
    topic: "Deadlock avoidance",
    preview:
      "…the banker's algorithm grants a resource request only if the resulting state is safe, meaning a completion sequence exists for every process…",
  },
  {
    doc: "Operating-Systems-Unit-1-to-3.pdf",
    page: 71,
    topic: "Deadlock detection",
    preview:
      "…a wait-for graph is maintained and a cycle in the graph indicates that the involved processes are deadlocked…",
  },
  {
    doc: "DBMS-Complete-Notes.pdf",
    page: 118,
    topic: "Concurrency control",
    preview:
      "…deadlocks in transactions are resolved either by wait-die and wound-wait schemes or by periodic detection and victim selection…",
  },
];

function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <>
      <PageHeader
        icon={Search}
        title="Search Documents"
        description="Look inside every uploaded PDF at once and jump straight to the right page."
      />

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-5 sm:p-6">
          <form
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!query.trim()) return;
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                setSubmitted(query.trim());
              }, 900);
            }}
          >
            <div className="relative min-w-0">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any topic inside uploaded documents"
                className="h-12 rounded-xl pl-10"
              />
            </div>
            <Button type="submit" className="h-12 shrink-0 rounded-xl px-6" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Try:</span>
            {["deadlock", "normalization", "TCP handshake"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQuery(t)}
                className="rounded-full border px-2.5 py-1 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : submitted ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Showing placeholder matches for “{submitted}” across your documents.
          </p>
          {placeholderResults.map((r, i) => (
            <Card
              key={`${r.doc}-${r.page}`}
              className="animate-rise rounded-2xl shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <p className="truncate text-sm font-semibold">{r.doc}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 rounded-full text-[11px]">
                    Page {r.page}
                  </Badge>
                </div>
                <Badge variant="outline" className="mt-3 rounded-full text-[11px]">
                  {r.topic}
                </Badge>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.preview}</p>
              </CardContent>
            </Card>
          ))}
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
