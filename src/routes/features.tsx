import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  FileCheck,
  FileSearch,
  FileText,
  Layers,
  ListChecks,
  MessagesSquare,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — ExamMateAI" },
      {
        name: "description",
        content:
          "Explore the complete capabilities of ExamMateAI: Study Material Library, Ask AI, PYQ Analysis, AI Summaries, Quizzes and Exam Readiness.",
      },
      { property: "og:title", content: "Features — ExamMateAI" },
      {
        property: "og:description",
        content:
          "Explore the complete capabilities of ExamMateAI: Study Material Library, Ask AI, PYQ Analysis, AI Summaries, Quizzes and Exam Readiness.",
      },
    ],
  }),
  component: FeaturesPage,
});

const featureSections = [
  {
    category: "LEARN",
    title: "Organize & Access Study Content",
    description: "Upload your course notes, slides and textbooks into an organized, searchable study library.",
    items: [
      {
        title: "1. Study Material Library",
        description: "Upload and organize study materials automatically by Subject → Chapter / Unit → Material.",
        icon: BookOpen,
      },
      {
        title: "2. Universal Document Support",
        description: "Study from multiple formats including PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX, CSV, Images and Markdown.",
        icon: FileText,
      },
      {
        title: "3. AI Document Understanding",
        description: "AI processes uploaded materials and identifies subject, chapter, chapter number, material type, description and key topics.",
        icon: Layers,
      },
      {
        title: "4. Document Search",
        description: "Search across uploaded study materials, topics, descriptions, chapters and extracted text content.",
        icon: Search,
      },
      {
        title: "5. AI Summaries",
        description: "Generate Short, Medium, or Detailed summaries from dense uploaded study materials.",
        icon: FileCheck,
      },
      {
        title: "6. Important Study Points",
        description: "Extract concise key study points from study materials to speed up pre-exam review.",
        icon: Sparkles,
      },
    ],
  },
  {
    category: "UNDERSTAND",
    title: "Document-Grounded Intelligence",
    description: "Ask questions about your uploaded materials with exact page-level and slide-level citations.",
    items: [
      {
        title: "7. Grounded Ask AI",
        description: "Ask questions about uploaded study materials and receive answers grounded strictly in your documents.",
        icon: MessagesSquare,
      },
      {
        title: "8. Source Citations",
        description: "Show document and exact location when available, such as AI Unit 3 Notes.pdf · Page 18 or NLP Lecture.pptx · Slide 12.",
        icon: CheckCircle2,
      },
      {
        title: "9. Topic Classification",
        description: "Classify concepts and organize study content structurally across chapters and units.",
        icon: Target,
      },
    ],
  },
  {
    category: "PREPARE",
    title: "Previous Year Paper Analytics",
    description: "Analyze PYQ trends to uncover repeated questions and focus on high-weightage topics.",
    items: [
      {
        title: "10. PYQ Analyzer",
        description: "Analyze previous-year question papers to understand structural exam trends.",
        icon: FileSearch,
      },
      {
        title: "11. Repeated Question Detection",
        description: "Detect exact and semantically similar questions across multiple exam years.",
        icon: FileSearch,
      },
      {
        title: "12. Frequently Asked Topics",
        description: "Identify topics that appear most frequently in previous-year question papers.",
        icon: Target,
      },
      {
        title: "13. Priority / Weightage Analysis",
        description: "Identify high-priority and high-weightage topics based on available marks and frequency data.",
        icon: Sparkles,
      },
    ],
  },
  {
    category: "PRACTICE",
    title: "Targeted Quizzes & Exam Readiness",
    description: "Test your understanding with AI-generated quizzes and track weak areas before the exam.",
    items: [
      {
        title: "14. AI Quiz Generation",
        description: "Generate quizzes from Study Materials, PYQs, Frequently Asked Topics, or Weak Topics.",
        icon: ListChecks,
      },
      {
        title: "15. Quiz Performance Analysis",
        description: "Identify score, strong topics, and weak topics from quiz performance.",
        icon: CheckCircle2,
      },
      {
        title: "16. Personalized Study Recommendations",
        description: "Recommend what students should study next based on actual available study, PYQ and quiz data.",
        icon: Target,
      },
      {
        title: "17. Exam Readiness",
        description: "Provide an exam-readiness indication based on available study, PYQ and practice quiz data.",
        icon: Sparkles,
      },
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <PublicHeader />

      <main className="mx-auto max-w-[1200px] px-6 py-16 lg:py-20">
        {/* HEADER */}
        <div className="max-w-3xl">
          <Badge variant="outline" className="rounded-sm text-xs font-sans mb-3">
            Features
          </Badge>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            ExamMateAI Capabilities
          </h1>
          <p className="mt-4 font-sans text-base leading-relaxed text-muted-foreground sm:text-lg">
            Detailed overview of all academic study tools built into ExamMateAI to support learning, document query, exam paper analysis, and practice quizzes.
          </p>
        </div>

        {/* FEATURE SECTIONS */}
        <div className="mt-14 space-y-16">
          {featureSections.map((sec) => (
            <div key={sec.category} className="space-y-6">
              <div className="border-b border-border pb-3">
                <span className="font-display font-bold text-sm tracking-wider uppercase text-secondary">
                  {sec.category}
                </span>
                <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
                  {sec.title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground font-sans">
                  {sec.description}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sec.items.map((item) => (
                  <Card
                    key={item.title}
                    className="rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                          <item.icon className="h-4 w-4 text-secondary" />
                        </span>
                        <h3 className="font-display font-medium text-base text-foreground">
                          {item.title}
                        </h3>
                      </div>
                      <p className="mt-3 text-xs font-sans leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 border-t border-border pt-12 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Ready to explore all features?
          </h2>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" className="rounded-none font-bold tracking-wider uppercase text-xs px-8 h-11">
              <Link to="/register">SIGN UP NOW</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-none font-bold tracking-wider uppercase text-xs px-8 h-11">
              <Link to="/login">LOG IN</Link>
            </Button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
