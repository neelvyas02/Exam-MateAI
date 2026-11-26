import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Copy, FileText, MessagesSquare, Send, Filter, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
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
import { MarkdownContent } from "@/components/markdown-content";
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
      citations?: any[];
      isGrounded: boolean;
      unverifiedContextUsed?: boolean;
      groundingStatus?: string;
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
      const matchedMat = selectedDocId
        ? store.materials.find((m) => m.id === selectedDocId)
        : materialsList[0] || store.materials[0];

      let directContext: string | undefined = undefined;
      if (matchedMat) {
        directContext = `Document: ${matchedMat.name}\nSubject: ${matchedMat.subject}\nChapter ${matchedMat.chapterNumber || "01"}: ${matchedMat.chapterName || ""}\nContent: ${matchedMat.extractedContent || matchedMat.description}\nTopics: ${(matchedMat.topics || []).join(", ")}`;
      }

      const apiResponse = await store.sendChatMessageAsync(q, selectedDocId, null, directContext);

      const resolvedMat = store.materials.find(
        (m) => m.id === selectedDocId || m.name === apiResponse.sourceDocument || m.id === apiResponse.documentId
      ) || matchedMat;

      const isSlides =
        resolvedMat?.materialType === "Lecture Slides" ||
        resolvedMat?.fileType === "PPTX" ||
        resolvedMat?.fileType === "PPT" ||
        resolvedMat?.name?.toLowerCase().includes("ppt") ||
        resolvedMat?.name?.toLowerCase().includes("slide");

      let citationLoc = apiResponse.sourceCitation || undefined;
      if (apiResponse.pageNumber) {
        citationLoc = isSlides ? `Slide ${apiResponse.pageNumber}` : `Page ${apiResponse.pageNumber}`;
      }

      const isGrounded =
        apiResponse.isGrounded !== undefined
          ? apiResponse.isGrounded
          : apiResponse.confidence >= 0.7 &&
            !apiResponse.message.toLowerCase().includes("couldn't find") &&
            !apiResponse.message.toLowerCase().includes("not covered in");

      const unverifiedContextUsed =
        apiResponse.unverifiedContextUsed !== undefined
          ? apiResponse.unverifiedContextUsed
          : apiResponse.message.includes("General Academic Context") ||
            apiResponse.message.toLowerCase().includes("not verified in your uploaded notes");

      setMessages((prev) => [
        ...prev,
        {
          id: apiResponse.id || crypto.randomUUID(),
          role: "assistant",
          text: apiResponse.message,
          sourceDoc: apiResponse.sourceDocument || resolvedMat?.name || undefined,
          citationLocation: citationLoc,
          citations: apiResponse.citations || apiResponse.sources,
          isGrounded,
          unverifiedContextUsed,
          groundingStatus: apiResponse.groundingStatus,
        },
      ]);
    } catch (error: any) {
      toast.error(error.message || "Failed to reach AI service");
      const matchedMat = materialsList[0] || store.materials[0];
      const isSlides =
        matchedMat?.materialType === "Lecture Slides" ||
        matchedMat?.fileType === "PPTX" ||
        matchedMat?.name?.toLowerCase().includes("ppt");

      const fallbackText = `⚠️ **Could not connect to the AI assistant service.**\n\n*Error details: ${error.message || "Network request failed"}*\n\nPlease make sure the backend server on port 5137 is running.`;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: fallbackText,
          sourceDoc: matchedMat?.name,
          citationLocation: isSlides ? "Slide 1" : "Page 1",
          isGrounded: false,
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
                        {m.name} {m.status && m.status !== "Ready" ? `(${m.status})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedMaterial !== "all" && (() => {
              const selectedMatObj = materialsList.find((m) => m.id === selectedMaterial);
              if (selectedMatObj && selectedMatObj.status && selectedMatObj.status !== "Ready") {
                return (
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 font-sans flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-blue-500" />
                    <span>The selected document <strong>"{selectedMatObj.name}"</strong> is currently {selectedMatObj.status.toLowerCase()}. Question answering will be fully grounded once indexing finishes.</span>
                  </div>
                );
              }
              return null;
            })()}
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
                  <MarkdownContent content={m.text} />

                  {m.sourceDoc ? (
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
                      {m.isGrounded && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm">
                          <CheckCircle2 className="h-3 w-3" /> Verified in Notes
                        </span>
                      )}
                    </div>
                  ) : null}

                  {m.unverifiedContextUsed && (
                    <div className="rounded-sm bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning-foreground font-medium font-sans flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                      <span>Grounding notice: Includes general academic knowledge not explicitly verified in your uploaded notes.</span>
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


