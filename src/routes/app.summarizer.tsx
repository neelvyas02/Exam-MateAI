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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studyMaterials } from "@/data/placeholder";

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
  const [doc, setDoc] = useState<string>("");
  const [length, setLength] = useState("short");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const selected = studyMaterials.find((m) => m.id === doc);

  return (
    <>
      <PageHeader
        icon={ScrollText}
        title="Notes Summarizer"
        description="Pick one of your uploaded documents and generate a revision-ready summary."
      />

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="grid gap-4 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="doc">Study material</Label>
            <Select value={doc} onValueChange={setDoc}>
              <SelectTrigger id="doc" className="rounded-xl">
                <SelectValue placeholder="Select an uploaded PDF" />
              </SelectTrigger>
              <SelectContent>
                {studyMaterials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Summary length</Label>
            <Tabs value={length} onValueChange={setLength}>
              <TabsList className="rounded-xl">
                <TabsTrigger value="short" className="rounded-lg">
                  Short
                </TabsTrigger>
                <TabsTrigger value="detailed" className="rounded-lg">
                  Detailed
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Button
            className="rounded-xl"
            disabled={!doc || loading}
            onClick={() => {
              setLoading(true);
              setReady(false);
              setTimeout(() => {
                setLoading(false);
                setReady(true);
                toast.info("Connect a backend to generate a real summary.");
              }, 1300);
            }}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {loading ? "Generating…" : "Generate Summary"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={i % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
            ))}
          </CardContent>
        </Card>
      ) : ready && selected ? (
        <Card className="animate-rise rounded-2xl shadow-soft">
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <CardTitle className="truncate text-base">{selected.name}</CardTitle>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="rounded-full capitalize">
                {length} summary
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => toast.success("Summary copied")}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
              The generated summary of <span className="font-medium text-foreground">{selected.name}</span>{" "}
              ({selected.pages} pages, {selected.subject}) will appear here, section by section, with the
              page range each point was drawn from. No text is generated in this frontend-only build.
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
