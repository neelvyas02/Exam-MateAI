import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Copy, FileText, MessagesSquare, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({
    meta: [
      { title: "AI Study Assistant — ExamMate AI" },
      {
        name: "description",
        content: "Ask questions and get answers grounded in your uploaded PDFs with page-level sources.",
      },
      { property: "og:title", content: "AI Study Assistant — ExamMate AI" },
      {
        property: "og:description",
        content: "Ask questions and get answers grounded in your uploaded PDFs with page-level sources.",
      },
    ],
  }),
  component: AssistantPage,
});

type Message =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      source: string;
      page: number;
      confidence: number;
    };

const seedMessages: Message[] = [
  { id: "1", role: "user", text: "Explain deadlock avoidance with the banker's algorithm." },
  {
    id: "2",
    role: "assistant",
    text: "Deadlock avoidance keeps the system in a safe state by checking, before every resource allocation, whether a sequence exists in which all processes can finish. The banker's algorithm models each process's maximum claim and current allocation, then grants a request only if the resulting state remains safe.",
    source: "Operating-Systems-Unit-1-to-3.pdf",
    page: 62,
    confidence: 94,
  },
];

const suggestions = [
  "Summarise the chapter on normalization",
  "What is the difference between paging and segmentation?",
  "List the important formulas in the networks handbook",
];

function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      toast.info("Connect a backend to generate real answers from your documents.");
    }, 1200);
  };

  return (
    <>
      <PageHeader
        icon={MessagesSquare}
        title="AI Study Assistant"
        description="Answers are generated only from the documents you have uploaded — never from the open web."
      />

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
          <Badge variant="secondary" className="w-fit gap-1.5 rounded-full">
            <Sparkles className="h-3.5 w-3.5" /> Grounded in 3 uploaded documents
          </Badge>

          <div className="space-y-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {m.text}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="max-w-[92%] rounded-2xl rounded-bl-sm border bg-card p-4 shadow-soft">
                  <p className="text-sm leading-relaxed">{m.text}</p>
                  <div className="mt-4 grid gap-3 rounded-xl bg-muted/50 p-3 sm:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Source document</p>
                      <p className="flex items-center gap-1.5 truncate text-xs font-semibold">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{m.source}</span>
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Page number</p>
                      <p className="text-xs font-semibold">Page {m.page}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">Confidence</p>
                      <p className="text-xs font-semibold">{m.confidence}%</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.text);
                        toast.success("Answer copied");
                      }}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => toast.success("Saved to your notes")}
                    >
                      <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                </div>
              ),
            )}

            {thinking ? (
              <div className="max-w-[92%] space-y-2.5 rounded-2xl rounded-bl-sm border bg-card p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="flex items-end gap-2 rounded-2xl border bg-background p-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything from your uploaded study materials..."
              className="min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
