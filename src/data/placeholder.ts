// Placeholder demonstration data only. Replace with real API data when a backend is added.

export type StudyMaterial = {
  id: string;
  name: string;
  subject: string;
  uploadedAt: string;
  pages: number;
  sizeMb: number;
  status: "processed" | "processing";
};

export type PreviousPaper = {
  id: string;
  name: string;
  subject: string;
  year: string;
  uploadedAt: string;
  pages: number;
  status: "analyzed" | "pending";
};

export const studyMaterials: StudyMaterial[] = [
  {
    id: "m1",
    name: "Operating-Systems-Unit-1-to-3.pdf",
    subject: "Operating Systems",
    uploadedAt: "2026-07-18",
    pages: 148,
    sizeMb: 6.4,
    status: "processed",
  },
  {
    id: "m2",
    name: "DBMS-Complete-Notes.pdf",
    subject: "Database Systems",
    uploadedAt: "2026-07-21",
    pages: 212,
    sizeMb: 9.1,
    status: "processed",
  },
  {
    id: "m3",
    name: "Computer-Networks-Handbook.pdf",
    subject: "Computer Networks",
    uploadedAt: "2026-07-25",
    pages: 96,
    sizeMb: 4.2,
    status: "processing",
  },
];

export const previousPapers: PreviousPaper[] = [
  {
    id: "p1",
    name: "OS-End-Sem-2023.pdf",
    subject: "Operating Systems",
    year: "2023",
    uploadedAt: "2026-07-19",
    pages: 4,
    status: "analyzed",
  },
  {
    id: "p2",
    name: "OS-End-Sem-2024.pdf",
    subject: "Operating Systems",
    year: "2024",
    uploadedAt: "2026-07-19",
    pages: 4,
    status: "analyzed",
  },
  {
    id: "p3",
    name: "DBMS-End-Sem-2024.pdf",
    subject: "Database Systems",
    year: "2024",
    uploadedAt: "2026-07-22",
    pages: 5,
    status: "pending",
  },
];

export const recentActivity = [
  { id: "a1", label: "Uploaded Computer-Networks-Handbook.pdf", meta: "Study material · 2 hours ago" },
  { id: "a2", label: "Asked: Explain deadlock avoidance with an example", meta: "AI assistant · 5 hours ago" },
  { id: "a3", label: "Analyzed 2 previous papers for Operating Systems", meta: "Paper analysis · yesterday" },
  { id: "a4", label: "Generated a detailed summary of DBMS-Complete-Notes.pdf", meta: "Notes summarizer · yesterday" },
  { id: "a5", label: "Generated a 10-question quiz on Normalization", meta: "Quiz generator · 2 days ago" },
];

export const subjects = Array.from(new Set(studyMaterials.map((m) => m.subject)));
