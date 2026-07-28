import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  FileSearch,
  FileUp,
  ListChecks,
  Menu,
  MessagesSquare,
  ScrollText,
  Search,
  Sparkles,
  Star,
  Quote,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExamMate AI — Smarter Exam Prep From Your Own PDFs" },
      {
        name: "description",
        content:
          "Upload notes and previous year question papers. ExamMate AI answers with page-level sources, finds repeated questions and generates summaries and quizzes.",
      },
      { property: "og:title", content: "ExamMate AI — Smarter Exam Prep From Your Own PDFs" },
      {
        property: "og:description",
        content:
          "Document-grounded AI study assistant with previous year question paper analysis.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: MessagesSquare,
    title: "AI Study Assistant",
    text: "Ask questions in plain language and get answers drawn only from your uploaded documents.",
  },
  {
    icon: FileUp,
    title: "PDF Upload",
    text: "Bring in lecture notes, textbooks and handouts as PDFs and keep them in one organised library.",
  },
  {
    icon: FileSearch,
    title: "Previous Paper Analysis",
    text: "Compare years of question papers to reveal repeated questions and high-weightage units.",
  },
  {
    icon: ScrollText,
    title: "AI Notes Summary",
    text: "Turn a dense 200-page PDF into a short or detailed revision summary in seconds.",
  },
  {
    icon: ListChecks,
    title: "Quiz Generator",
    text: "Create practice MCQs from a chosen document with your own difficulty and question count.",
  },
  {
    icon: Star,
    title: "Important Topics",
    text: "See which concepts keep coming back so your revision time goes where it matters most.",
  },
];

const steps = [
  { n: "01", title: "Upload your material", text: "Add study PDFs and previous year question papers to your workspace." },
  { n: "02", title: "AI reads the documents", text: "Content is indexed page by page so every answer can be traced back." },
  { n: "03", title: "Ask and analyse", text: "Query your notes, analyse papers and spot repeated questions and topics." },
  { n: "04", title: "Revise with outputs", text: "Generate summaries, quizzes and an important-topics list for the exam." },
];

const nav = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

function Landing() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 border-x-0 border-t-0">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="min-w-0">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <nav className="mr-2 hidden items-center gap-1 lg:flex">
              {nav.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/register">Get Started</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {open ? (
          <div className="border-t px-4 pb-4 pt-2 lg:hidden">
            <nav className="flex flex-col">
              {nav.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section id="home" className="grid-hero relative overflow-hidden border-b">
          <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:py-28">
            <Badge variant="secondary" className="animate-rise mx-auto gap-1.5 rounded-full px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" /> Answers grounded in your own PDFs
            </Badge>
            <h1 className="animate-rise mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl">
              ExamMate <span className="text-gradient">AI</span>
            </h1>
            <p className="animate-rise mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Your AI-powered study companion for smarter exam preparation.
            </p>
            <div className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-xl shadow-glow">
                <Link to="/register">
                  Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl">
                <a href="#features">Learn More</a>
              </Button>
            </div>

            <div className="mx-auto mt-16 max-w-4xl">
              <Card className="glass overflow-hidden rounded-3xl p-0 text-left shadow-glow">
                <CardContent className="p-0">
                  <div className="flex items-center gap-2 border-b px-5 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      ExamMate AI · Study Assistant
                    </span>
                  </div>
                  <div className="space-y-4 p-5 sm:p-7">
                    <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                      Which topics repeat the most in the last three OS papers?
                    </div>
                    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border bg-card p-4">
                      <p className="text-sm leading-relaxed">
                        Deadlock handling, CPU scheduling algorithms and page replacement appear in
                        all three papers, together accounting for a large share of the marks.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full">
                          OS-End-Sem-2024.pdf · p. 2
                        </Badge>
                        <Badge variant="secondary" className="rounded-full">
                          OS-End-Sem-2023.pdf · p. 1
                        </Badge>
                        <Badge className="rounded-full">Confidence 94%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <Badge variant="outline" className="rounded-full">
              Features
            </Badge>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Everything you need, built around your documents
            </h2>
            <p className="mt-3 text-muted-foreground">
              No generic content and no guesswork — every feature works from the material you upload.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group rounded-2xl border-border/70 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
              >
                <CardContent className="p-6">
                  <span className="bg-brand grid h-11 w-11 place-items-center rounded-xl text-primary-foreground transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y bg-muted/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Badge variant="outline" className="rounded-full">
                How it works
              </Badge>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">From upload to exam-ready</h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <Card key={s.n} className="relative rounded-2xl shadow-soft">
                  <CardContent className="p-6">
                    <span className="text-gradient font-display text-3xl font-extrabold">{s.n}</span>
                    <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Badge variant="outline" className="rounded-full">
                About
              </Badge>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Built for students who revise from real papers
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                ExamMate AI is not a chatbot with opinions. It is a focused workspace that reads the
                study materials and previous year question papers you upload, then helps you find
                what actually matters before an exam — repeated questions, high-weightage units and
                the concepts examiners return to year after year.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Every answer cites the source document and page number, so you can always verify it
                against your own notes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild className="rounded-xl">
                  <Link to="/register">Create free account</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/app">Explore the dashboard</Link>
                </Button>
              </div>
            </div>
            <Card className="rounded-3xl shadow-soft">
              <CardContent className="p-7">
                <Quote className="h-7 w-7 text-primary" />
                <p className="mt-4 text-lg leading-relaxed">
                  “Instead of re-reading three hundred pages, I now revise the twelve topics that
                  keep repeating — and I know exactly which page each one is on.”
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="bg-brand grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground">
                    AR
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Ananya R.</p>
                    <p className="truncate text-xs text-muted-foreground">Final year engineering student</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="contact" className="border-t bg-muted/40 py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <span className="bg-brand mx-auto grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground shadow-glow">
              <BrainCircuit className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-3xl font-bold sm:text-4xl">Contact us</h2>
            <p className="mt-3 text-muted-foreground">
              Questions, feedback or campus partnerships? Reach the team at{" "}
              <span className="font-medium text-foreground">hello@exammate.ai</span>
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-xl shadow-glow">
                <Link to="/register">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl">
                <Link to="/app/search">
                  <Search className="mr-1.5 h-4 w-4" /> Try smart search
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Intelligent question paper analysis and a study assistant grounded in your own PDFs.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {nav.map((item) => (
              <a key={item.label} href={item.href} className="hover:text-foreground">
                {item.label}
              </a>
            ))}
            <Link to="/login" className="hover:text-foreground">
              Login
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-7xl px-4 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} ExamMate AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
