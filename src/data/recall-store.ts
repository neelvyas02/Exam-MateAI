import { useState, useEffect } from "react";

export type MaterialType =
  | "Study Notes"
  | "Textbook Chapter"
  | "Lecture Slides"
  | "Handwritten Notes"
  | "Reference Sheet"
  | "Code / Notebook";

export type StudyMaterialItem = {
  id: string;
  name: string;
  fileType: string;
  fileSizeMb: number;
  subject: string;
  chapterNumber: string;
  chapterName: string;
  materialType: MaterialType;
  description: string;
  topics: string[];
  pagesOrSlides: number;
  uploadedAt: string;
  extractedContent: string;
  confidence: {
    subject: "high" | "low";
    chapter: "high" | "low";
    materialType: "high" | "low";
  };
  suggestedMetadata?: {
    subject?: string;
    chapterNumber?: string;
    chapterName?: string;
    materialType?: MaterialType;
  };
};

export type PYQQuestion = {
  id: string;
  text: string;
  marks?: number; // Optional! If missing, do not fabricate
  type: "Descriptive" | "Short Answer" | "MCQ" | "Numerical";
  topic: string;
  subtopic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  paperId: string;
  year: string;
  subject: string;
};

export type PYQPaper = {
  id: string;
  name: string;
  fileType: string;
  subject: string;
  year: string;
  uploadedAt: string;
  pages: number;
  questionsCount: number;
};

export type SimilarQuestionGroup = {
  id: string;
  canonicalQuestion: string;
  topic: string;
  similarityPercentage: number;
  occurrencesCount: number;
  years: string[];
  questions: PYQQuestion[];
};

export type TopicFrequency = {
  topic: string;
  subject: string;
  questionCount: number;
  totalMarks?: number; // present if marks available
  years: string[];
  priority: "High" | "Medium" | "Low";
  isHighWeightage: boolean; // true if marks available and high
  relatedMaterials: string[]; // material IDs
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  sourceDoc: string;
  sourcePageOrSlide?: string;
};

export type QuizAttempt = {
  id: string;
  subject: string;
  chapter?: string;
  source: "Study Material" | "Previous Year Questions" | "Frequently Asked Topics" | "Weak Topics";
  difficulty: "Easy" | "Medium" | "Hard";
  totalQuestions: number;
  score: number;
  percentage: number;
  completedAt: string;
  strongTopics: string[];
  weakTopics: string[];
};

export type StudyRecommendation = {
  id: string;
  topic: string;
  subject: string;
  reasons: string[];
  priority: "High" | "Medium";
  chapterNumber?: string;
  chapterName?: string;
};

// Initial Seed Data
const initialMaterials: StudyMaterialItem[] = [
  {
    id: "m1",
    name: "AI Introduction & Foundations.pdf",
    fileType: "PDF",
    fileSizeMb: 4.8,
    subject: "Artificial Intelligence",
    chapterNumber: "01",
    chapterName: "Introduction to AI",
    materialType: "Study Notes",
    description: "Fundamental principles of intelligent agents, problem formulations, state spaces, and uninformed search strategies.",
    topics: ["Intelligent Agents", "State Space Search", "BFS & DFS", "Heuristics"],
    pagesOrSlides: 42,
    uploadedAt: "2026-08-10",
    extractedContent: "An intelligent agent acts rationally to achieve goals. State space representation consists of initial states, actions, transition models, and goal tests. Breadth-First Search (BFS) is complete and optimal when step costs are equal.",
    confidence: { subject: "high", chapter: "high", materialType: "high" },
  },
  {
    id: "m2",
    name: "AI Lecture 01 - Intelligent Agents.docx",
    fileType: "DOCX",
    fileSizeMb: 2.1,
    subject: "Artificial Intelligence",
    chapterNumber: "01",
    chapterName: "Introduction to AI",
    materialType: "Lecture Slides",
    description: "Class transcript and instructor notes on PEAS framework and environment classifications.",
    topics: ["PEAS Framework", "Environment Types", "Agent Architectures"],
    pagesOrSlides: 18,
    uploadedAt: "2026-08-11",
    extractedContent: "PEAS stands for Performance Measure, Environment, Actuators, and Sensors. Environments can be fully observable, deterministic, episodic, static, and discrete.",
    confidence: { subject: "high", chapter: "high", materialType: "high" },
  },
  {
    id: "m3",
    name: "Industrial AI Applications.pptx",
    fileType: "PPTX",
    fileSizeMb: 8.4,
    subject: "Artificial Intelligence",
    chapterNumber: "02",
    chapterName: "Industrial AI",
    materialType: "Lecture Slides",
    description: "Slide deck covering computer vision inspection, predictive maintenance, and robotic process automation in manufacturing.",
    topics: ["Predictive Maintenance", "Computer Vision Quality Inspection", "RPA"],
    pagesOrSlides: 35,
    uploadedAt: "2026-08-12",
    extractedContent: "Industrial AI applies machine vision for defect detection in modern assembly lines. Predictive maintenance utilizes IoT sensor telemetry and time-series anomaly detection.",
    confidence: { subject: "high", chapter: "high", materialType: "high" },
  },
  {
    id: "m4",
    name: "NLP Notes & Semantic Processing.pdf",
    fileType: "PDF",
    fileSizeMb: 6.7,
    subject: "Artificial Intelligence",
    chapterNumber: "03",
    chapterName: "Knowledge Representation & NLP",
    materialType: "Study Notes",
    description: "Comprehensive notes on natural language parsing, semantic analysis, discourse integration, and pragmatics.",
    topics: ["Semantic Analysis", "Morphological Processing", "Syntactic Parsing", "WordNet & Ontologies"],
    pagesOrSlides: 54,
    uploadedAt: "2026-08-14",
    extractedContent: "Semantic analysis extracts domain meaning from syntactically parsed text structures. Morphological analysis processes word structures, while syntactic parsing builds parse trees based on formal context-free grammars.",
    confidence: { subject: "high", chapter: "high", materialType: "high" },
  },
  {
    id: "m5",
    name: "NLP Lecture - Parse Trees & Semantics.pptx",
    fileType: "PPTX",
    fileSizeMb: 11.2,
    subject: "Artificial Intelligence",
    chapterNumber: "03",
    chapterName: "Knowledge Representation & NLP",
    materialType: "Lecture Slides",
    description: "Detailed slides illustrating semantic disambiguation, frame representations, and dependency parsing.",
    topics: ["Semantic Analysis", "Dependency Parsing", "Frame Representation"],
    pagesOrSlides: 28,
    uploadedAt: "2026-08-15",
    extractedContent: "Dependency parsing establishes binary semantic relations between words. Frame representation links verbs with case roles like Agent, Instrument, and Patient.",
    confidence: { subject: "high", chapter: "high", materialType: "high" },
  },
  {
    id: "m6",
    name: "Handwritten NLP Formulae & Rules.jpg",
    fileType: "JPG",
    fileSizeMb: 3.5,
    subject: "Artificial Intelligence",
    chapterNumber: "03",
    chapterName: "Knowledge Representation & NLP",
    materialType: "Handwritten Notes",
    description: "Scanned handwritten summary sheet covering CFG rules, TF-IDF formulas, and n-gram probability calculations.",
    topics: ["TF-IDF Formula", "N-Gram Language Models", "Context Free Grammars"],
    pagesOrSlides: 4,
    uploadedAt: "2026-08-16",
    extractedContent: "TF-IDF = TF(t,d) * log(N / DF(t)). N-gram probability P(w_n | w_1...w_{n-1}) uses Markov assumption for computational feasibility.",
    confidence: { subject: "high", chapter: "high", materialType: "high" },
  },
  {
    id: "m7",
    name: "Operating-Systems-Unit-1-to-3.pdf",
    fileType: "PDF",
    fileSizeMb: 6.4,
    subject: "Operating Systems",
    chapterNumber: "01",
    chapterName: "Process Management & Deadlocks",
    materialType: "Textbook Chapter",
    description: "Complete textbook unit covering process synchronization, mutex locks, semaphores, and deadlock prevention.",
    topics: ["Deadlock Avoidance", "Banker's Algorithm", "Process Scheduling", "Semaphores"],
    pagesOrSlides: 148,
    uploadedAt: "2026-07-18",
    extractedContent: "Deadlock avoidance requires that the operating system has prior information regarding resource allocation. Banker's algorithm calculates safe states to grant resource requests.",
    confidence: { subject: "high", chapter: "high", materialType: "high" },
  },
  {
    id: "m8",
    name: "DBMS-Complete-Notes.pdf",
    fileType: "PDF",
    fileSizeMb: 9.1,
    subject: "Database Systems",
    chapterNumber: "02",
    chapterName: "Relational Design & Normalization",
    materialType: "Study Notes",
    description: "In-depth guide to 1NF, 2NF, 3NF, BCNF decomposition, relational algebra, and ACID transaction guarantees.",
    topics: ["Normalization", "BCNF Decomposition", "Relational Algebra", "ACID Properties"],
    pagesOrSlides: 212,
    uploadedAt: "2026-07-21",
    extractedContent: "Normalization minimizes data redundancy. 3NF removes transitive dependencies. BCNF ensures that for every non-trivial functional dependency X -> Y, X is a super key.",
    confidence: { subject: "high", chapter: "high", materialType: "high" },
  },
];

const initialPapers: PYQPaper[] = [
  {
    id: "p1",
    name: "AI_EndSem_Exam_2025.pdf",
    fileType: "PDF",
    subject: "Artificial Intelligence",
    year: "2025",
    uploadedAt: "2026-08-01",
    pages: 5,
    questionsCount: 10,
  },
  {
    id: "p2",
    name: "AI_EndSem_Exam_2024.docx",
    fileType: "DOCX",
    subject: "Artificial Intelligence",
    year: "2024",
    uploadedAt: "2026-08-02",
    pages: 4,
    questionsCount: 9,
  },
  {
    id: "p3",
    name: "AI_EndSem_Exam_2023.jpg",
    fileType: "JPG",
    subject: "Artificial Intelligence",
    year: "2023",
    uploadedAt: "2026-08-03",
    pages: 3,
    questionsCount: 8,
  },
  {
    id: "p4",
    name: "OS_EndSem_Exam_2024.pdf",
    fileType: "PDF",
    subject: "Operating Systems",
    year: "2024",
    uploadedAt: "2026-07-19",
    pages: 4,
    questionsCount: 8,
  },
];

const initialQuestions: PYQQuestion[] = [
  {
    id: "q1",
    text: "Describe the essential steps involved in Natural Language Processing (NLP) pipeline.",
    marks: 10,
    type: "Descriptive",
    topic: "Natural Language Processing",
    subtopic: "NLP Processing Pipeline",
    difficulty: "Medium",
    paperId: "p1",
    year: "2025",
    subject: "Artificial Intelligence",
  },
  {
    id: "q2",
    text: "Explain the different stages and levels of syntactic and semantic analysis in NLP.",
    marks: 10,
    type: "Descriptive",
    topic: "Natural Language Processing",
    subtopic: "Semantic Analysis",
    difficulty: "Hard",
    paperId: "p2",
    year: "2024",
    subject: "Artificial Intelligence",
  },
  {
    id: "q3",
    text: "What is semantic analysis in NLP? Illustrate with a concrete parse tree example.",
    marks: 8,
    type: "Descriptive",
    topic: "Natural Language Processing",
    subtopic: "Semantic Analysis",
    difficulty: "Medium",
    paperId: "p3",
    year: "2023",
    subject: "Artificial Intelligence",
  },
  {
    id: "q4",
    text: "Compare and contrast First-Order Logic (FOL) with Propositional Logic for Knowledge Representation.",
    marks: 10,
    type: "Descriptive",
    topic: "Knowledge Representation",
    subtopic: "First Order Logic",
    difficulty: "Medium",
    paperId: "p1",
    year: "2025",
    subject: "Artificial Intelligence",
  },
  {
    id: "q5",
    text: "Explain how semantic networks and frames represent domain knowledge.",
    marks: 7,
    type: "Short Answer",
    topic: "Knowledge Representation",
    subtopic: "Semantic Networks",
    difficulty: "Medium",
    paperId: "p2",
    year: "2024",
    subject: "Artificial Intelligence",
  },
  {
    id: "q6",
    text: "Explain Deadlock Avoidance using Banker's Algorithm with a multi-resource state example.",
    marks: 12,
    type: "Descriptive",
    topic: "Deadlock Management",
    subtopic: "Banker's Algorithm",
    difficulty: "Hard",
    paperId: "p4",
    year: "2024",
    subject: "Operating Systems",
  },
];

const initialSimilarGroups: SimilarQuestionGroup[] = [
  {
    id: "sg1",
    canonicalQuestion: "Explain the stages and steps involved in Natural Language Processing (Semantic Analysis).",
    topic: "Natural Language Processing",
    similarityPercentage: 94,
    occurrencesCount: 3,
    years: ["2023", "2024", "2025"],
    questions: [initialQuestions[0], initialQuestions[1], initialQuestions[2]],
  },
  {
    id: "sg2",
    canonicalQuestion: "Knowledge Representation using First-Order Logic and Semantic Networks.",
    topic: "Knowledge Representation",
    similarityPercentage: 86,
    occurrencesCount: 2,
    years: ["2024", "2025"],
    questions: [initialQuestions[3], initialQuestions[4]],
  },
];

const initialTopicFrequencies: TopicFrequency[] = [
  {
    topic: "Natural Language Processing",
    subject: "Artificial Intelligence",
    questionCount: 12,
    totalMarks: 94,
    years: ["2023", "2024", "2025"],
    priority: "High",
    isHighWeightage: true,
    relatedMaterials: ["m4", "m5", "m6"],
  },
  {
    topic: "Knowledge Representation",
    subject: "Artificial Intelligence",
    questionCount: 9,
    totalMarks: 72,
    years: ["2023", "2024", "2025"],
    priority: "High",
    isHighWeightage: true,
    relatedMaterials: ["m4"],
  },
  {
    topic: "Intelligent Search & Heuristics",
    subject: "Artificial Intelligence",
    questionCount: 6,
    totalMarks: 45,
    years: ["2024", "2025"],
    priority: "Medium",
    isHighWeightage: false,
    relatedMaterials: ["m1", "m2"],
  },
  {
    topic: "Industrial Machine Vision",
    subject: "Artificial Intelligence",
    questionCount: 4,
    totalMarks: 28,
    years: ["2024"],
    priority: "Medium",
    isHighWeightage: false,
    relatedMaterials: ["m3"],
  },
];

const initialQuizAttempts: QuizAttempt[] = [
  {
    id: "qa1",
    subject: "Artificial Intelligence",
    chapter: "Knowledge Representation & NLP",
    source: "Frequently Asked Topics",
    difficulty: "Medium",
    totalQuestions: 10,
    score: 4,
    percentage: 40,
    completedAt: "2026-08-19",
    strongTopics: ["BFS Search", "PEAS Framework"],
    weakTopics: ["Semantic Analysis", "Morphological Parsing"],
  },
];

const initialRecommendations: StudyRecommendation[] = [
  {
    id: "rec1",
    topic: "Semantic Analysis",
    subject: "Artificial Intelligence",
    reasons: [
      "Frequently asked in PYQs (12 questions across 2023-2025)",
      "High priority in Unit 03 Knowledge Representation & NLP",
      "Weak quiz performance (40% score in recent practice quiz)",
      "Not studied in the last 5 days",
    ],
    priority: "High",
    chapterNumber: "03",
    chapterName: "Knowledge Representation & NLP",
  },
  {
    id: "rec2",
    topic: "First-Order Logic & Semantic Nets",
    subject: "Artificial Intelligence",
    reasons: [
      "Repeated in 2024 & 2025 question papers",
      "High total marks weightage (72 marks total)",
      "Important foundation topic",
    ],
    priority: "High",
    chapterNumber: "03",
    chapterName: "Knowledge Representation & NLP",
  },
];

import {
  healthApi,
  subjectsApi,
  chaptersApi,
  documentsApi,
  analysisApi,
  chatApi,
  summaryApi,
  quizApi,
  searchApi,
  SubjectDto,
  ChapterDto,
  DocumentDto,
  QuestionAnalysisDto,
  ChatMessageDto,
  SummaryDto,
  QuizDto,
  QuizResultDto,
  SearchResponseDto,
} from "@/lib/api";

export const defaultSubjects: SubjectDto[] = [
  {
    id: "5aaeaabf-649d-4067-b4e7-967002faab52",
    name: "Computer Networks",
    semester: "Semester 5",
    description: "Foundations of computer networking, OSI model, TCP/IP, and routing protocols.",
    documentCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "71054229-3e39-4611-83f1-6ed6f9b2728a",
    name: "Database Management Systems",
    semester: "Semester 4",
    description: "Relational database concepts, SQL, normalization, and transaction processing.",
    documentCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "4e8c0bb7-38e0-4042-b778-37887677d917",
    name: "Operating Systems",
    semester: "Semester 4",
    description: "OS architecture, processes, threads, CPU scheduling, memory management, and file systems.",
    documentCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "subj-ai",
    name: "Artificial Intelligence",
    semester: "Semester 6",
    description: "Intelligent agents, problem formulations, search algorithms, and knowledge representation.",
    documentCount: 1,
    createdAt: new Date().toISOString(),
  },
];

export const defaultChapters: ChapterDto[] = [
  { id: "3332a064-e093-4df9-921b-ec0232f5c5e2", subjectId: "5aaeaabf-649d-4067-b4e7-967002faab52", subjectName: "Computer Networks", number: "1", name: "Introduction to Networking & Physical Layer", createdAt: new Date().toISOString() },
  { id: "851e59af-c61c-4bf7-a720-dd635f1f45af", subjectId: "5aaeaabf-649d-4067-b4e7-967002faab52", subjectName: "Computer Networks", number: "2", name: "Data Link Layer & MAC Protocols", createdAt: new Date().toISOString() },
  { id: "ad20b730-12bc-4292-9985-101d678f8bcd", subjectId: "5aaeaabf-649d-4067-b4e7-967002faab52", subjectName: "Computer Networks", number: "3", name: "Network Layer & IP Routing", createdAt: new Date().toISOString() },
  { id: "4efb7c69-fa16-47ff-9f0e-99af3b6f3dc2", subjectId: "5aaeaabf-649d-4067-b4e7-967002faab52", subjectName: "Computer Networks", number: "4", name: "Transport Layer (TCP/UDP)", createdAt: new Date().toISOString() },

  { id: "chap-dbms-1", subjectId: "71054229-3e39-4611-83f1-6ed6f9b2728a", subjectName: "Database Management Systems", number: "1", name: "Relational Model & Relational Algebra", createdAt: new Date().toISOString() },
  { id: "chap-dbms-2", subjectId: "71054229-3e39-4611-83f1-6ed6f9b2728a", subjectName: "Database Management Systems", number: "2", name: "SQL & Advanced Querying", createdAt: new Date().toISOString() },
  { id: "chap-dbms-3", subjectId: "71054229-3e39-4611-83f1-6ed6f9b2728a", subjectName: "Database Management Systems", number: "3", name: "Database Normalization", createdAt: new Date().toISOString() },
  { id: "chap-dbms-4", subjectId: "71054229-3e39-4611-83f1-6ed6f9b2728a", subjectName: "Database Management Systems", number: "4", name: "Transaction Management & Concurrency Control", createdAt: new Date().toISOString() },

  { id: "chap-os-1", subjectId: "4e8c0bb7-38e0-4042-b778-37887677d917", subjectName: "Operating Systems", number: "1", name: "Process Management & Synchronization", createdAt: new Date().toISOString() },
  { id: "chap-os-2", subjectId: "4e8c0bb7-38e0-4042-b778-37887677d917", subjectName: "Operating Systems", number: "2", name: "CPU Scheduling Algorithms", createdAt: new Date().toISOString() },
  { id: "chap-os-3", subjectId: "4e8c0bb7-38e0-4042-b778-37887677d917", subjectName: "Operating Systems", number: "3", name: "Memory Management & Virtual Memory", createdAt: new Date().toISOString() },
  { id: "chap-os-4", subjectId: "4e8c0bb7-38e0-4042-b778-37887677d917", subjectName: "Operating Systems", number: "4", name: "File Systems & Storage Management", createdAt: new Date().toISOString() },

  { id: "chap-ai-1", subjectId: "subj-ai", subjectName: "Artificial Intelligence", number: "01", name: "Introduction to AI", createdAt: new Date().toISOString() },
  { id: "chap-ai-2", subjectId: "subj-ai", subjectName: "Artificial Intelligence", number: "02", name: "Intelligent Agents & Search", createdAt: new Date().toISOString() },
  { id: "chap-ai-3", subjectId: "subj-ai", subjectName: "Artificial Intelligence", number: "03", name: "Knowledge Representation & NLP", createdAt: new Date().toISOString() },
];

// Reactive Store State Hook
export function useRecallStore() {
  const [backendAvailable, setBackendAvailable] = useState<boolean>(false);
  const [backendLoading, setBackendLoading] = useState<boolean>(false);
  const [subjects, setSubjects] = useState<SubjectDto[]>(() => {
    if (typeof window === "undefined") return defaultSubjects;
    const saved = localStorage.getItem("recall_subjects");
    return saved ? JSON.parse(saved) : defaultSubjects;
  });
  const [chapters, setChapters] = useState<ChapterDto[]>(() => {
    if (typeof window === "undefined") return defaultChapters;
    const saved = localStorage.getItem("recall_chapters");
    return saved ? JSON.parse(saved) : defaultChapters;
  });

  const [materials, setMaterials] = useState<StudyMaterialItem[]>(() => {
    if (typeof window === "undefined") return initialMaterials;
    const saved = localStorage.getItem("recall_materials");
    return saved ? JSON.parse(saved) : initialMaterials;
  });

  const [papers, setPapers] = useState<PYQPaper[]>(() => {
    if (typeof window === "undefined") return initialPapers;
    const saved = localStorage.getItem("recall_papers");
    return saved ? JSON.parse(saved) : initialPapers;
  });

  const [questions, setQuestions] = useState<PYQQuestion[]>(() => {
    if (typeof window === "undefined") return initialQuestions;
    const saved = localStorage.getItem("recall_questions");
    return saved ? JSON.parse(saved) : initialQuestions;
  });

  const [similarGroups, setSimilarGroups] = useState<SimilarQuestionGroup[]>(() => {
    if (typeof window === "undefined") return initialSimilarGroups;
    const saved = localStorage.getItem("recall_similar_groups");
    return saved ? JSON.parse(saved) : initialSimilarGroups;
  });

  const [topicFrequencies, setTopicFrequencies] = useState<TopicFrequency[]>(() => {
    if (typeof window === "undefined") return initialTopicFrequencies;
    const saved = localStorage.getItem("recall_topic_frequencies");
    return saved ? JSON.parse(saved) : initialTopicFrequencies;
  });

  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>(() => {
    if (typeof window === "undefined") return initialQuizAttempts;
    const saved = localStorage.getItem("recall_quiz_attempts");
    return saved ? JSON.parse(saved) : initialQuizAttempts;
  });

  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>(() => {
    if (typeof window === "undefined") return initialRecommendations;
    const saved = localStorage.getItem("recall_recommendations");
    return saved ? JSON.parse(saved) : initialRecommendations;
  });

  // Check health and load initial backend data
  useEffect(() => {
    let isMounted = true;
    async function initBackend() {
      try {
        const available = await healthApi.isBackendAvailable();
        if (isMounted) setBackendAvailable(available);

        if (available) {
          const fetchedSubjects = await subjectsApi.getSubjects();
          if (isMounted && fetchedSubjects.length > 0) {
            setSubjects(fetchedSubjects);

            // Fetch chapters for all subjects
            const allChapters: ChapterDto[] = [];
            for (const s of fetchedSubjects) {
              try {
                const sChapters = await chaptersApi.getChapters(s.id);
                allChapters.push(...sChapters);
              } catch { }
            }
            if (isMounted && allChapters.length > 0) {
              setChapters(allChapters);
            }
          }

          const userDocs = await documentsApi.getUserDocuments();
          if (isMounted && userDocs.length > 0) {
            const backendMaterials: StudyMaterialItem[] = userDocs
              .filter((d) => d.documentType === "StudyMaterial" || d.documentType === "0")
              .map((d) => ({
                id: d.id,
                name: d.materialName || d.originalName || d.fileName,
                fileType: d.fileName.split(".").pop()?.toUpperCase() || "PDF",
                fileSizeMb: Number((d.fileSize / (1024 * 1024)).toFixed(2)),
                subject: d.subjectName || "General Subject",
                chapterNumber: d.chapterNumber || "01",
                chapterName: d.chapterName || "General Chapter",
                materialType: (d.materialType as MaterialType) || "Study Notes",
                description: d.description || d.statusMessage || "Uploaded study material",
                topics: d.topics && d.topics.length > 0 ? d.topics : [d.subjectName],
                pagesOrSlides: d.pageCount || 1,
                uploadedAt: d.uploadedAt ? d.uploadedAt.split("T")[0] : new Date().toISOString().split("T")[0],
                extractedContent: d.summary || d.title || "",
                confidence: { subject: "high", chapter: "high", materialType: "high" },
              }));

            const backendPapers: PYQPaper[] = userDocs
              .filter((d) => d.documentType === "PreviousPaper" || d.documentType === "1")
              .map((d) => ({
                id: d.id,
                name: d.originalName || d.fileName,
                fileType: d.fileName.split(".").pop()?.toUpperCase() || "PDF",
                subject: d.subjectName || "General Subject",
                year: new Date().getFullYear().toString(),
                uploadedAt: d.uploadedAt ? d.uploadedAt.split("T")[0] : new Date().toISOString().split("T")[0],
                pages: d.pageCount || 1,
                questionsCount: 5,
              }));

            if (backendMaterials.length > 0) {
              setMaterials((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const uniqueNew = backendMaterials.filter((m) => !existingIds.has(m.id));
                return [...uniqueNew, ...prev];
              });
            }

            if (backendPapers.length > 0) {
              setPapers((prev) => {
                const existingIds = new Set(prev.map((paperItem) => paperItem.id));
                const uniqueNew = backendPapers.filter((paperItem) => !existingIds.has(paperItem.id));
                return [...uniqueNew, ...prev];
              });
            }
          }
        }
      } catch (err) {
        if (isMounted) setBackendAvailable(false);
      }
    }

    initBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("recall_subjects", JSON.stringify(subjects));
    }
  }, [subjects]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("recall_chapters", JSON.stringify(chapters));
    }
  }, [chapters]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("recall_materials", JSON.stringify(materials));
    }
  }, [materials]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("recall_papers", JSON.stringify(papers));
    }
  }, [papers]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("recall_quiz_attempts", JSON.stringify(quizAttempts));
    }
  }, [quizAttempts]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("recall_recommendations", JSON.stringify(recommendations));
    }
  }, [recommendations]);

  // Async Action: Create Subject
  const createSubjectAsync = async (name: string, semester: string, description?: string): Promise<SubjectDto> => {
    setBackendLoading(true);
    try {
      try {
        const newSubject = await subjectsApi.createSubject({ name, semester, description });
        setSubjects((prev) => {
          const filtered = prev.filter((s) => s.id !== newSubject.id && s.name.toLowerCase() !== newSubject.name.toLowerCase());
          return [...filtered, newSubject];
        });
        return newSubject;
      } catch (err: any) {
        console.warn("Backend subject creation failed, keeping local subject:", err);
        const localSubject: SubjectDto = {
          id: `subj-${Date.now()}`,
          name,
          semester: semester || "Semester 6",
          description: description || "",
          documentCount: 0,
          createdAt: new Date().toISOString(),
        };
        setSubjects((prev) => [...prev, localSubject]);
        return localSubject;
      }
    } finally {
      setBackendLoading(false);
    }
  };

  // Async Action: Create Chapter
  const createChapterAsync = async (subjectId: string, number: string, name: string, description?: string): Promise<ChapterDto> => {
    setBackendLoading(true);
    try {
      try {
        const newChapter = await chaptersApi.createChapter({ subjectId, number, name, description });
        setChapters((prev) => [...prev, newChapter]);
        return newChapter;
      } catch (err: any) {
        const matchingSubj = subjects.find((s) => s.id === subjectId);
        const localChapter: ChapterDto = {
          id: `chap-${Date.now()}`,
          subjectId,
          subjectName: matchingSubj?.name || "Subject",
          number,
          name,
          description: description || "",
          documentCount: 0,
          createdAt: new Date().toISOString(),
        };
        setChapters((prev) => [...prev, localChapter]);
        return localChapter;
      }
    } finally {
      setBackendLoading(false);
    }
  };

  // Async Action: Fetch Chapters for Subject
  const fetchChaptersForSubject = async (subjectId: string): Promise<ChapterDto[]> => {
    try {
      const subjectChapters = await chaptersApi.getChapters(subjectId);
      if (subjectChapters && subjectChapters.length > 0) {
        setChapters((prev) => {
          const others = prev.filter((c) => c.subjectId !== subjectId);
          return [...others, ...subjectChapters];
        });
        return subjectChapters;
      }
      return chapters.filter((c) => c.subjectId === subjectId);
    } catch {
      return chapters.filter((c) => c.subjectId === subjectId);
    }
  };

  // Async Action: Upload Document
  const uploadDocumentAsync = async (
    file: File,
    subjectId: string,
    chapterId?: string | null,
    documentType: "StudyMaterial" | "PreviousPaper" = "StudyMaterial"
  ): Promise<DocumentDto | null> => {
    setBackendLoading(true);
    try {
      let doc: DocumentDto;
      if (documentType === "PreviousPaper") {
        doc = await documentsApi.uploadPreviousPaper(file, subjectId, chapterId);
      } else {
        doc = await documentsApi.uploadPdf(file, subjectId, chapterId, documentType);
      }

      if (documentType === "PreviousPaper") {
        const newPaper: PYQPaper = {
          id: doc.id,
          name: doc.originalName || doc.fileName,
          fileType: doc.fileName.split(".").pop()?.toUpperCase() || "PDF",
          subject: doc.subjectName || "General Subject",
          year: new Date().getFullYear().toString(),
          uploadedAt: new Date().toISOString().split("T")[0],
          pages: doc.pageCount || 1,
          questionsCount: 5,
        };
        setPapers((prev) => [newPaper, ...prev]);
      } else {
        const newMat: StudyMaterialItem = {
          id: doc.id,
          name: doc.materialName || doc.originalName || doc.fileName,
          fileType: doc.fileName.split(".").pop()?.toUpperCase() || "PDF",
          fileSizeMb: Number((doc.fileSize / (1024 * 1024)).toFixed(2)),
          subject: doc.subjectName || "General Subject",
          chapterNumber: doc.chapterNumber || "01",
          chapterName: doc.chapterName || "General Chapter",
          materialType: (doc.materialType as MaterialType) || "Study Notes",
          description: doc.description || doc.statusMessage || "Uploaded study material",
          topics: doc.topics && doc.topics.length > 0 ? doc.topics : [doc.subjectName],
          pagesOrSlides: doc.pageCount || 1,
          uploadedAt: new Date().toISOString().split("T")[0],
          extractedContent: doc.summary || doc.title || "",
          confidence: { subject: "high", chapter: "high", materialType: "high" },
        };
        setMaterials((prev) => [newMat, ...prev]);
      }

      return doc;
    } catch (error) {
      throw error;
    } finally {
      setBackendLoading(false);
    }
  };

  // Async Action: Analyze Papers
  const analyzePapersAsync = async (paperIds: string[]): Promise<QuestionAnalysisDto> => {
    setBackendLoading(true);
    try {
      const result = await analysisApi.analyzePreviousPapers(paperIds);
      if (result.repeatedQuestions && result.repeatedQuestions.length > 0) {
        const newGroup: SimilarQuestionGroup = {
          id: result.id,
          canonicalQuestion: result.repeatedQuestions[0],
          topic: result.repeatedTopics?.[0] || "General Topic",
          similarityPercentage: 92,
          occurrencesCount: result.repeatedQuestions.length,
          years: ["2024", "2025"],
          questions: result.repeatedQuestions.map((q, idx) => ({
            id: `${result.id}_q${idx}`,
            text: q,
            type: "Descriptive",
            topic: result.repeatedTopics?.[0] || "General Topic",
            subtopic: "Analysis Result",
            difficulty: "Medium",
            paperId: paperIds[0] || result.documentId,
            year: "2025",
            subject: "Analysis Subject",
          })),
        };
        setSimilarGroups((prev) => [newGroup, ...prev]);
      }
      return result;
    } finally {
      setBackendLoading(false);
    }
  };

  // Async Action: Send Chat Message
  const sendChatMessageAsync = async (
    question: string,
    documentId?: string | null,
    conversationId?: string | null
  ): Promise<ChatMessageDto> => {
    setBackendLoading(true);
    try {
      return await chatApi.askQuestion(question, documentId, conversationId);
    } finally {
      setBackendLoading(false);
    }
  };

  // Async Action: Summarize Document
  const summarizeDocumentAsync = async (
    documentId: string,
    summaryType: 0 | 1 | 2 = 0
  ): Promise<SummaryDto> => {
    setBackendLoading(true);
    try {
      return await summaryApi.summarizeDocument(documentId, summaryType);
    } finally {
      setBackendLoading(false);
    }
  };

  // Async Action: Generate Quiz
  const generateQuizAsync = async (
    subjectId: string,
    difficulty: string = "Medium",
    questionCount: number = 5
  ): Promise<QuizDto> => {
    setBackendLoading(true);
    try {
      return await quizApi.generateQuiz(subjectId, difficulty, questionCount);
    } finally {
      setBackendLoading(false);
    }
  };

  // Async Action: Submit Quiz
  const submitQuizAsync = async (
    quizId: string,
    answers: Array<{ questionId: string; selectedOption: string }>
  ): Promise<QuizResultDto> => {
    setBackendLoading(true);
    try {
      const result = await quizApi.submitQuiz({ quizId, answers });

      const attempt: QuizAttempt = {
        id: result.quizId,
        subject: "Subject Practice",
        source: "Study Material",
        difficulty: "Medium",
        totalQuestions: result.totalQuestions,
        score: result.score,
        percentage: Math.round(result.percentage),
        completedAt: new Date().toISOString().split("T")[0],
        strongTopics: ["Answered correctly"],
        weakTopics: result.percentage < 70 ? ["Review incorrect questions"] : [],
      };
      recordQuizAttempt(attempt);

      return result;
    } finally {
      setBackendLoading(false);
    }
  };

  // Async Action: Search
  const searchAsync = async (keyword: string): Promise<SearchResponseDto> => {
    setBackendLoading(true);
    try {
      return await searchApi.search(keyword);
    } finally {
      setBackendLoading(false);
    }
  };

  // Derived readiness score (or null if empty)
  const calculateReadiness = (): { score: number; details: string } | null => {
    if (materials.length === 0 && papers.length === 0 && quizAttempts.length === 0) {
      return null;
    }
    const materialScore = Math.min(materials.length * 12, 40);
    const pyqScore = Math.min(papers.length * 15, 30);
    const avgQuizScore =
      quizAttempts.length > 0
        ? Math.round(
            (quizAttempts.reduce((acc, q) => acc + q.percentage, 0) / quizAttempts.length) * 0.3
          )
        : 10;
    const total = Math.min(materialScore + pyqScore + avgQuizScore, 92);
    return {
      score: total,
      details: `${materials.length} Materials · ${papers.length} PYQs · ${quizAttempts.length} Quizzes`,
    };
  };

  const addMaterial = (newMat: StudyMaterialItem) => {
    setMaterials((prev) => [newMat, ...prev]);
  };

  const addPaper = (newPaper: PYQPaper, newQs: PYQQuestion[]) => {
    setPapers((prev) => [newPaper, ...prev]);
    setQuestions((prev) => [...newQs, ...prev]);
  };

  const recordQuizAttempt = (attempt: QuizAttempt) => {
    setQuizAttempts((prev) => [attempt, ...prev]);

    // Update Recommendations if there are weak topics
    if (attempt.weakTopics.length > 0) {
      const topWeak = attempt.weakTopics[0];
      const newRec: StudyRecommendation = {
        id: `rec_${Date.now()}`,
        topic: topWeak,
        subject: attempt.subject,
        reasons: [
          `Identified as weak topic in recent ${attempt.source} quiz`,
          `Scored ${attempt.percentage}% on latest test`,
          `High priority revision recommended`,
        ],
        priority: "High",
        chapterNumber: "03",
        chapterName: "Knowledge Representation & NLP",
      };
      setRecommendations((prev) => [newRec, ...prev.filter((r) => r.topic !== topWeak)]);
    }
  };

  return {
    backendAvailable,
    backendLoading,
    subjects,
    chapters,
    materials,
    papers,
    questions,
    similarGroups,
    topicFrequencies,
    quizAttempts,
    recommendations,
    readiness: calculateReadiness(),
    addMaterial,
    addPaper,
    recordQuizAttempt,
    uploadDocumentAsync,
    createSubjectAsync,
    createChapterAsync,
    fetchChaptersForSubject,
    analyzePapersAsync,
    sendChatMessageAsync,
    summarizeDocumentAsync,
    generateQuizAsync,
    submitQuizAsync,
    searchAsync,
  };
}
