import { useState } from "react";
import {
  FileText,
  ListOrdered,
  Sparkles,
  Send,
  Flame,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StudyMaterialItem } from "@/data/recall-store";

export function MaterialDetailDialog({
  material,
  open,
  onOpenChange,
}: {
  material: StudyMaterialItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [summaryLength, setSummaryLength] = useState<"short" | "medium" | "detailed">("medium");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "ai"; text: string; citation?: string }>
  >([
    {
      role: "ai",
      text: `Hello! I am ready to answer any questions grounded strictly in "${material?.name || "this document"}".`,
      citation: `${material?.name} · Page 1`,
    },
  ]);

  if (!material) return null;

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");

    setTimeout(() => {
      // Grounded answer search simulation
      if (
        userMsg.toLowerCase().includes("quantum") ||
        userMsg.toLowerCase().includes("blockchain") ||
        userMsg.toLowerCase().includes("react native")
      ) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: "I couldn't find enough information about this in your uploaded study material.",
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: `Based on Section 3 of ${material.name}, ${material.extractedContent.slice(0, 180)}...`,
            citation: `${material.name} · Page 18`,
          },
        ]);
      }
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto p-6 border border-border bg-card shadow-soft">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-sm text-xs font-sans">
              {material.fileType}
            </Badge>
            <Badge variant="outline" className="rounded-sm text-xs font-sans">
              {material.subject}
            </Badge>
            <Badge variant="outline" className="rounded-sm text-xs font-sans">
              Chapter {material.chapterNumber}: {material.chapterName}
            </Badge>
          </div>
          <DialogTitle className="mt-3 text-2xl font-semibold font-display text-foreground tracking-tight">
            {material.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-sans mt-1">{material.description}</p>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 rounded-none h-9 border border-border bg-muted/40">
            <TabsTrigger value="overview" className="rounded-none text-xs font-sans">
              Overview
            </TabsTrigger>
            <TabsTrigger value="summary" className="rounded-none text-xs font-sans">
              Summary
            </TabsTrigger>
            <TabsTrigger value="important" className="rounded-none text-xs font-sans">
              Important Points
            </TabsTrigger>
            <TabsTrigger value="ask" className="rounded-none text-xs font-sans">
              Ask AI
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Document Metadata
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Material Type</span>
                  <span className="font-semibold text-foreground">{material.materialType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Length</span>
                  <span className="font-semibold text-foreground">{material.pagesOrSlides} Pages / Slides</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">File Size</span>
                  <span className="font-semibold text-foreground">{material.fileSizeMb} MB</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Uploaded</span>
                  <span className="font-semibold text-foreground">{material.uploadedAt}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Detected Topics
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {material.topics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="rounded-sm text-xs font-sans">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                Extracted Document Content
              </h4>
              <div className="rounded-xl border border-border bg-card p-4 text-xs font-serif leading-[1.65] text-foreground/90 max-h-48 overflow-y-auto">
                {material.extractedContent}
              </div>
            </div>
          </TabsContent>

          {/* SUMMARY TAB — EDITORIAL TYPOGRAPHY IN LITERATA */}
          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground font-sans">Summary Detail:</span>
              <div className="flex gap-1.5">
                {(["short", "medium", "detailed"] as const).map((len) => (
                  <Button
                    key={len}
                    variant={summaryLength === len ? "default" : "outline"}
                    size="sm"
                    className="rounded-none text-xs capitalize font-sans h-8 px-3"
                    onClick={() => setSummaryLength(len)}
                  >
                    {len}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-4 font-serif">
              <h4 className="text-xl font-medium font-display tracking-tight text-foreground">
                Executive Summary — {material.name}
              </h4>
              {summaryLength === "short" && (
                <p className="text-sm sm:text-base leading-[1.65] text-foreground/90">
                  {material.description} Primary emphasis is placed on domain definitions, formal notation, and core theoretical algorithms required for academic mastery.
                </p>
              )}
              {summaryLength === "medium" && (
                <p className="text-sm sm:text-base leading-[1.65] text-foreground/90">
                  {material.extractedContent} The chapter systematically outlines the structural components, transition steps, and operational constraints required for high-scoring responses in final examinations.
                </p>
              )}
              {summaryLength === "detailed" && (
                <div className="space-y-4 text-sm sm:text-base leading-[1.65] text-foreground/90">
                  <p>{material.extractedContent}</p>
                  <p>
                    Key theorems and algorithms covered include formal context-free grammar transformations, state-space tree traversal limits, and dependency parsing schemas. All examples are directly backed by the primary text.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* IMPORTANT POINTS TAB */}
          <TabsContent value="important" className="mt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
              Concise Revision Points & PYQ Backing
            </h4>
            <div className="space-y-2.5">
              {material.topics.map((topic, i) => {
                const isFrequent = i % 2 === 0;
                return (
                  <div
                    key={topic}
                    className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-card text-xs font-sans"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-none bg-accent text-accent-foreground font-bold text-[11px]">
                        0{i + 1}
                      </span>
                      <span className="font-medium text-foreground text-sm">{topic}</span>
                    </div>
                    {isFrequent && (
                      <Badge className="rounded-sm bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[11px] font-sans">
                        <Flame className="h-3 w-3 fill-destructive" /> Frequently asked in PYQs
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ASK AI TAB */}
          <TabsContent value="ask" className="mt-4 space-y-4">
            <div className="space-y-3 max-h-60 overflow-y-auto p-1">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-3.5 text-xs sm:text-sm animate-fade-in-up ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none font-sans leading-relaxed"
                        : "bg-muted/30 border border-border text-foreground rounded-bl-none font-serif leading-[1.65]"
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.citation && (
                      <p className="mt-2 text-[11px] font-sans border-t border-border pt-1 font-semibold text-secondary flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Source: {msg.citation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Textarea
                placeholder={`Ask anything about ${material.name}...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="min-h-11 resize-none text-xs sm:text-sm rounded-none font-sans"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
              />
              <Button size="icon" className="rounded-none shrink-0 h-11 w-11" onClick={handleSendChat}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* QUICK ACTIONS FOOTER */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="outline" className="rounded-none text-xs font-sans" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-none text-xs font-sans">
              <Link to="/app/assistant">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-secondary" /> Ask AI
              </Link>
            </Button>
            <Button asChild className="rounded-none text-xs font-sans">
              <Link to="/app/quiz">
                <ListOrdered className="mr-1.5 h-3.5 w-3.5" /> Practice Quiz
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

