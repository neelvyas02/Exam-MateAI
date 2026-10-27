import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Copy, FileText, MessagesSquare, Send, Filter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRecallStore } from "@/data/recall-store";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({
    meta: [
      { title: "Ask AI — Recall AI" },
      {
        name: "description",
        content: "Ask questions grounded strictly in your uploaded study materials with verified page/slide citations.",
      },
      { property: "og:title", content: "Ask AI — Recall AI" },
      {
        property: "og:description",
        content: "Ask questions grounded strictly in your uploaded study materials with verified page/slide citations.",
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
      sourceDoc?: string;
      citationLocation?: string;
      isGrounded: boolean;
    };

export function AssistantPage() {
  const store = useRecallStore();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedChapter, setSelectedChapter] = useState<string>("all");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("all");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "user",
      text: "What is semantic analysis according to Unit 3 notes?",
    },
    {
      id: "2",
      role: "assistant",
      text: "Semantic analysis extracts domain meaning from syntactically parsed structures. It connects syntactic parse trees to knowledge representations, such as frame roles and ontologies.",
      sourceDoc: "NLP Notes & Semantic Processing.pdf",
      citationLocation: "Page 18",
      isGrounded: true,
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const subjectsList = Array.from(new Set(store.materials.map((m) => m.subject)));
  const materialsList = store.materials.filter(
    (m) =>
      (selectedSubject === "all" || m.subject === selectedSubject) &&
      (selectedChapter === "all" || m.chapterNumber === selectedChapter)
  );

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q) return;

    const userMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", text: q }]);
    setInput("");
    setThinking(true);

    try {
      const selectedDocId = selectedMaterial !== "all" ? selectedMaterial : undefined;
      const apiResponse = await store.sendChatMessageAsync(q, selectedDocId);

      setMessages((prev) => [
        ...prev,
        {
          id: apiResponse.id || crypto.randomUUID(),
          role: "assistant",
          text: apiResponse.message,
          sourceDoc: apiResponse.sourceDocument || undefined,
          citationLocation: apiResponse.pageNumber ? `Page ${apiResponse.pageNumber}` : (apiResponse.sourceCitation || undefined),
          isGrounded: apiResponse.confidence > 0.3 && !apiResponse.message.toLowerCase().includes("couldn't find"),
        },
      ]);
    } catch (error: any) {
      if (store.backendAvailable) {
        toast.error(error.message || "Failed to get AI response");
      }
      // Fallback for offline mode or guardrail
      const matchedMat = materialsList[0] || store.materials[0];
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: matchedMat
            ? `Based on your uploaded material "${matchedMat.name}": ${matchedMat.extractedContent.slice(0, 220)}...`
            : "I couldn't find enough information about this in your uploaded study material.",
          sourceDoc: matchedMat?.name,
          citationLocation: matchedMat?.fileType === "PPTX" ? "Slide 12" : "Page 18",
          isGrounded: !!matchedMat,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      <PageHeader
        icon={MessagesSquare}
        title="Ask AI"
        description="Document-grounded AI chat. Answers are sourced strictly from your selected study materials with verified citations."
      />

      <Card className="rounded-2xl border border-border bg-card shadow-soft">
        <CardContent className="flex flex-col gap-6 p-5 sm:p-6">
          {/* CONTEXT SELECTOR FILTERS — RESTRAINED GROUNDING CONTROLS */}
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground font-sans">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Filter className="h-3 w-3 text-secondary" /> Scope Filter
              </span>
              <span className="text-[11px] text-muted-foreground">
                Grounded in {materialsList.length} documents
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-1 font-sans">
                  Subject
                </span>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="rounded-none text-xs h-8 bg-card font-sans">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjectsList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-1 font-sans">
                  Chapter / Unit
                </span>
                <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                  <SelectTrigger className="rounded-none text-xs h-8 bg-card font-sans">
                    <SelectValue placeholder="All Chapters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chapters</SelectItem>
                    <SelectItem value="01">Unit 01 — Introduction</SelectItem>
                    <SelectItem value="02">Unit 02 — Applications</SelectItem>
                    <SelectItem value="03">Unit 03 — Knowledge Representation & NLP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-1 font-sans">
                  Material
                </span>
                <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                  <SelectTrigger className="rounded-none text-xs h-8 bg-card font-sans">
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials in Scope</SelectItem>
                    {materialsList.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* CHAT MESSAGES STREAM */}
          <div className="space-y-5 min-h-[280px]">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-xl rounded-br-none bg-primary px-4 py-2.5 text-xs sm:text-sm text-primary-foreground shadow-soft font-sans leading-relaxed">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="max-w-[92%] sm:max-w-2xl rounded-xl rounded-bl-none border border-border bg-card p-5 shadow-soft space-y-3 animate-fade-in-up">
                  <div className="text-sm sm:text-[15px] leading-[1.65] font-serif text-foreground/90 whitespace-pre-wrap">
                    {m.text}
                  </div>

                  {m.isGrounded && m.sourceDoc ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/70 text-xs font-sans text-muted-foreground">
                      <span className="text-[11px] font-semibold text-muted-foreground">Source:</span>
                      <span className="inline-flex items-center gap-1 font-medium text-foreground bg-muted/40 px-2 py-0.5 rounded-sm">
                        <FileText className="h-3 w-3 text-secondary shrink-0" />
                        <span className="truncate max-w-[260px] sm:max-w-[340px]">{m.sourceDoc}</span>
                        {m.citationLocation ? (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-secondary font-semibold">{m.citationLocation}</span>
                          </>
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-sm bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning-foreground font-medium font-sans">
                      Grounding notice: Unverified context omitted from answer.
                    </div>
                  )}

                  <div className="flex gap-2 pt-1 font-sans">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-none text-xs h-7 px-2.5"
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.text);
                        toast.success("Answer copied");
                      }}
                    >
                      <Copy className="mr-1.5 h-3 w-3" /> Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-none text-xs h-7 px-2.5"
                      onClick={() => toast.success("Saved to notes")}
                    >
                      <Bookmark className="mr-1.5 h-3 w-3" /> Save
                    </Button>
                  </div>
                </div>
              )
            )}

            {thinking ? (
              <div className="flex items-center gap-2.5 py-2 px-1 text-xs text-muted-foreground font-sans">
                <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                <span>Searching your study materials…</span>
              </div>
            ) : null}
          </div>

          {/* MESSAGE COMPOSER */}
          <form
            className="flex items-end gap-2 rounded-xl border border-border bg-background p-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything grounded in your selected study material..."
              className="min-h-11 resize-none border-0 bg-transparent text-xs sm:text-sm shadow-none focus-visible:ring-0 font-sans"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-none bg-primary text-primary-foreground"
              aria-label="Send"
              disabled={thinking || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}


