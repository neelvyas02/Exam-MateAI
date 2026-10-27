import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpenCheck,
  ChevronRight,
  Eye,
  FileText,
  FolderTree,
  Loader2,
  Plus,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { UploadDropzone } from "@/components/upload-dropzone";
import { MaterialDetailDialog } from "@/components/material-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudyMaterialItem, useRecallStore } from "@/data/recall-store";

export const Route = createFileRoute("/app/materials")({
  head: () => ({
    meta: [
      { title: "Library — ExamMateAI" },
      { name: "description", content: "AI-organized study materials structured by Subject and Chapter." },
      { property: "og:title", content: "Library — ExamMateAI" },
      {
        property: "og:description",
        content: "AI-organized study materials structured by Subject and Chapter.",
      },
    ],
  }),
  component: LibraryPage,
});

export function LibraryPage() {
  const store = useRecallStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterialItem | null>(null);

  // Upload Confirmation Dialog State
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");

  // Inline "Add Subject" & "Add Chapter" Form State
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState("Semester 6");
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  const [showAddChapterForm, setShowAddChapterForm] = useState(false);
  const [newChapterNumber, setNewChapterNumber] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [isAddingChapter, setIsAddingChapter] = useState(false);

  // Processing Progress Modal State
  const [isProcessing, setIsProcessing] = useState(false);

  // Group materials by Subject -> Chapter
  const subjectsMap: Record<string, Record<string, StudyMaterialItem[]>> = {};
  store.materials.forEach((item) => {
    if (!subjectsMap[item.subject]) {
      subjectsMap[item.subject] = {};
    }
    const chapKey = `${item.chapterNumber} ${item.chapterName}`;
    if (!subjectsMap[item.subject][chapKey]) {
      subjectsMap[item.subject][chapKey] = [];
    }
    subjectsMap[item.subject][chapKey].push(item);
  });

  const subjectsList = Object.keys(subjectsMap);

  // Step 1: User selects a file -> DO NOT upload immediately, open Add Study Material dialog
  const handleSelectFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setPendingFile(file);

    // If there is already an active/selected subject in the view, default to it
    let chosenSubjId = "";
    const matchedSubject = store.subjects.find((s) => s.name === selectedSubject);
    if (matchedSubject) {
      chosenSubjId = matchedSubject.id;
    } else if (store.subjects.length > 0) {
      chosenSubjId = store.subjects[0].id;
    }

    if (chosenSubjId) {
      setSelectedSubjectId(chosenSubjId);
      const chaps = await store.fetchChaptersForSubject(chosenSubjId);
      if (chaps && chaps.length > 0) {
        setSelectedChapterId(chaps[0].id);
      } else {
        const localChaps = store.chapters.filter((c) => c.subjectId === chosenSubjId);
        setSelectedChapterId(localChaps.length > 0 ? localChaps[0].id : "");
      }
    } else {
      setSelectedSubjectId("");
      setSelectedChapterId("");
    }
  };

  // Filtered chapters based on selected Subject
  const availableChapters = store.chapters.filter((c) => c.subjectId === selectedSubjectId);

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedChapterId("");
    const fetchedChapters = await store.fetchChaptersForSubject(subjectId);
    if (fetchedChapters && fetchedChapters.length > 0) {
      setSelectedChapterId(fetchedChapters[0].id);
    } else {
      const localChaps = store.chapters.filter((c) => c.subjectId === subjectId);
      if (localChaps.length > 0) {
        setSelectedChapterId(localChaps[0].id);
      }
    }
  };

  // Inline Add Subject action
  const handleSaveNewSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error("Subject name is required");
      return;
    }
    setIsAddingSubject(true);
    try {
      const created = await store.createSubjectAsync(newSubjectName.trim(), newSubjectSemester.trim());
      setSelectedSubjectId(created.id);
      setNewSubjectName("");
      setShowAddSubjectForm(false);
      toast.success(`Subject "${created.name}" ready!`);
      const chaps = await store.fetchChaptersForSubject(created.id);
      if (chaps && chaps.length > 0) {
        setSelectedChapterId(chaps[0].id);
      } else {
        setSelectedChapterId("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create subject");
    } finally {
      setIsAddingSubject(false);
    }
  };

  // Inline Add Chapter action
  const handleSaveNewChapter = async () => {
    if (!selectedSubjectId) {
      toast.error("Please select a subject first");
      return;
    }
    if (!newChapterName.trim()) {
      toast.error("Chapter name is required");
      return;
    }
    setIsAddingChapter(true);
    try {
      const num = newChapterNumber.trim() || `0${availableChapters.length + 1}`;
      const created = await store.createChapterAsync(selectedSubjectId, num, newChapterName.trim());
      setSelectedChapterId(created.id);
      setNewChapterNumber("");
      setNewChapterName("");
      setShowAddChapterForm(false);
      toast.success(`Added chapter: ${created.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create chapter");
    } finally {
      setIsAddingChapter(false);
    }
  };

  // Step 2: Student confirms upload
  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    if (!selectedSubjectId) {
      toast.error("Please select a Subject");
      return;
    }
    if (!selectedChapterId) {
      toast.error("Please select a Chapter / Unit");
      return;
    }

    const fileToUpload = pendingFile;
    const chosenSubject = store.subjects.find((s) => s.id === selectedSubjectId);
    const chosenChapter = store.chapters.find((c) => c.id === selectedChapterId);

    // Close configuration modal & open restrained processing modal
    setPendingFile(null);
    setIsProcessing(true);

    try {
      const doc = await store.uploadDocumentAsync(
        fileToUpload,
        selectedSubjectId,
        selectedChapterId,
        "StudyMaterial"
      );

      setIsProcessing(false);
      toast.success(`Uploaded ${doc?.originalName || fileToUpload.name} under ${chosenSubject?.name || "Subject"} → ${chosenChapter?.name || "Chapter"}`);
      if (chosenSubject?.name) {
        setSelectedSubject(chosenSubject.name);
      }
    } catch (err: any) {
      setIsProcessing(false);
      toast.error(err.message || "Failed to upload study material");
    }
  };

  // Search filtering
  const filteredSearch = searchQuery.trim()
    ? store.materials.filter((m) => {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q) ||
          m.chapterName.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.extractedContent.toLowerCase().includes(q) ||
          m.topics.some((t) => t.toLowerCase().includes(q))
        );
      })
    : null;

  return (
    <>
      <PageHeader
        icon={BookOpenCheck}
        title="Library"
        description="Your materials are organized into Subject → Chapter hierarchy. AI analyses content while preserving your chosen structure."
      />

      {/* Universal Upload Zone */}
      <UploadDropzone
        label="Upload anything you study from."
        hint="PDF · DOC · DOCX · PPT · PPTX · TXT · RTF · ODT · XLS · XLSX · CSV · JPG · JPEG · PNG · WEBP · MD · HTML"
        onFiles={handleSelectFiles}
      />

      {/* Search Input across entire Library */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search materials, subjects, chapters, extracted text or topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-none h-10"
        />
      </div>

      {/* SEARCH RESULTS VIEW */}
      {filteredSearch ? (
        <div className="space-y-4">
          <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Search Results ({filteredSearch.length} found)
          </h3>
          {filteredSearch.length === 0 ? (
            <p className="text-xs text-muted-foreground italic font-sans">No matching materials found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSearch.map((m) => (
                <Card
                  key={m.id}
                  className="rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-0.5 cursor-pointer"
                  onClick={() => setActiveMaterial(m)}
                >
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="rounded-sm text-[10px]">
                        {m.fileType}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-sans font-semibold">
                        {m.subject} → Ch {m.chapterNumber}
                      </span>
                    </div>
                    <h4 className="font-display font-medium text-base truncate text-foreground">{m.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 font-sans">{m.description}</p>
                    <div className="pt-3 flex items-center justify-between border-t border-border text-[11px] text-muted-foreground font-sans">
                      <span>{m.pagesOrSlides} Pages / Slides</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs rounded-none">
                        <Eye className="mr-1 h-3 w-3" /> View Detail
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : selectedSubject ? (
        /* SUBJECT DETAIL VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-none mb-2 text-xs font-sans text-muted-foreground"
                onClick={() => setSelectedSubject(null)}
              >
                ← Back to All Subjects
              </Button>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {selectedSubject}
              </h2>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">
                {Object.keys(subjectsMap[selectedSubject] || {}).length} Chapters •{" "}
                {Object.values(subjectsMap[selectedSubject] || {}).flat().length} Materials
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(subjectsMap[selectedSubject] || {}).map(([chapterKey, mats]) => (
              <Card key={chapterKey} className="rounded-2xl border border-border bg-card shadow-soft">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="font-display text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-secondary" /> {chapterKey}
                    </span>
                    <Badge variant="outline" className="rounded-sm text-xs font-sans">
                      {mats.length} {mats.length === 1 ? "material" : "materials"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                  {mats.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-accent/40 cursor-pointer"
                      onClick={() => setActiveMaterial(m)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                          <FileText className="h-4 w-4 text-secondary" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-display font-medium text-sm truncate text-foreground">{m.name}</p>
                          <p className="text-xs text-muted-foreground font-sans truncate">
                            {m.materialType} • {m.pagesOrSlides} pages/slides • {m.fileSizeMb} MB
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* MAIN SUBJECT LIST VIEW */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjectsList.map((subj) => {
            const chapCount = Object.keys(subjectsMap[subj]).length;
            const matCount = Object.values(subjectsMap[subj]).flat().length;

            return (
              <Card
                key={subj}
                className="rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => setSelectedSubject(subj)}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <BookOpenCheck className="h-5 w-5 text-secondary" />
                    </span>
                    <Badge variant="secondary" className="rounded-sm text-xs">
                      {matCount} materials
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-display font-medium text-lg text-foreground">{subj}</h3>
                    <p className="text-xs text-muted-foreground font-sans mt-1">
                      {chapCount} {chapCount === 1 ? "Chapter" : "Chapters"} automatically organized
                    </p>
                  </div>

                  <div className="border-t border-border pt-3 flex items-center justify-between text-xs font-sans font-semibold text-secondary">
                    <span>Explore Chapters</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. UPLOAD MATERIAL FLOW — ADD STUDY MATERIAL CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <Dialog open={Boolean(pendingFile)} onOpenChange={(open) => { if (!open) setPendingFile(null); }}>
        <DialogContent className="max-w-lg rounded-2xl p-6 border border-border bg-card shadow-soft font-sans">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="font-display text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-secondary" /> Add Study Material
            </DialogTitle>
          </DialogHeader>

          {pendingFile && (
            <div className="space-y-5 pt-3">
              {/* Selected file info card */}
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary/10 text-secondary">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider font-semibold">
                      Selected file:
                    </p>
                    <p className="font-display font-medium text-sm truncate text-foreground">
                      {pendingFile.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-sans">
                      {(pendingFile.size / (1024 * 1024)).toFixed(2)} MB • {pendingFile.name.split(".").pop()?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-none text-xs font-mono uppercase">
                  {pendingFile.name.split(".").pop()?.toUpperCase()}
                </Badge>
              </div>

              {/* Subject Selection (Required) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Subject <span className="text-destructive">*</span>
                  </Label>
                  {!showAddSubjectForm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-secondary font-semibold hover:text-secondary/80 rounded-none p-0"
                      onClick={() => setShowAddSubjectForm(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Subject
                    </Button>
                  )}
                </div>

                {showAddSubjectForm ? (
                  <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold font-display text-foreground">Add New Subject</span>
                      <button
                        type="button"
                        onClick={() => setShowAddSubjectForm(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-2">
                      <Input
                        placeholder="Subject Name (e.g. Data Warehousing)"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        className="h-8 text-xs rounded-none bg-background"
                      />
                      <Input
                        placeholder="Semester (e.g. Semester 7)"
                        value={newSubjectSemester}
                        onChange={(e) => setNewSubjectSemester(e.target.value)}
                        className="h-8 text-xs rounded-none bg-background"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-none"
                        onClick={() => setShowAddSubjectForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs rounded-none bg-secondary text-secondary-foreground"
                        disabled={isAddingSubject || !newSubjectName.trim()}
                        onClick={handleSaveNewSubject}
                      >
                        {isAddingSubject ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save Subject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select value={selectedSubjectId || undefined} onValueChange={handleSubjectChange}>
                    <SelectTrigger className="w-full h-10 rounded-none border-border bg-background text-xs cursor-pointer">
                      <SelectValue placeholder="Select Subject ▼" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-[60]">
                      {store.subjects.map((subj) => (
                        <SelectItem key={subj.id} value={subj.id} className="text-xs cursor-pointer">
                          {subj.name} {subj.semester ? `(${subj.semester})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Chapter / Unit Selection (Required) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Chapter / Unit <span className="text-destructive">*</span>
                  </Label>
                  {!showAddChapterForm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-secondary font-semibold hover:text-secondary/80 rounded-none p-0"
                      disabled={!selectedSubjectId}
                      onClick={() => setShowAddChapterForm(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Chapter
                    </Button>
                  )}
                </div>

                {showAddChapterForm ? (
                  <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold font-display text-foreground">Add New Chapter / Unit</span>
                      <button
                        type="button"
                        onClick={() => setShowAddChapterForm(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-2">
                      <Input
                        placeholder="Chapter Number (e.g. Unit 3 or 03)"
                        value={newChapterNumber}
                        onChange={(e) => setNewChapterNumber(e.target.value)}
                        className="h-8 text-xs rounded-none bg-background"
                      />
                      <Input
                        placeholder="Chapter Name (e.g. OLAP and Data Warehousing)"
                        value={newChapterName}
                        onChange={(e) => setNewChapterName(e.target.value)}
                        className="h-8 text-xs rounded-none bg-background"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-none"
                        onClick={() => setShowAddChapterForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs rounded-none bg-secondary text-secondary-foreground"
                        disabled={isAddingChapter || !newChapterName.trim()}
                        onClick={handleSaveNewChapter}
                      >
                        {isAddingChapter ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save Chapter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select
                    value={selectedChapterId || undefined}
                    onValueChange={setSelectedChapterId}
                    disabled={!selectedSubjectId || availableChapters.length === 0}
                  >
                    <SelectTrigger className="w-full h-10 rounded-none border-border bg-background text-xs cursor-pointer">
                      <SelectValue
                        placeholder={
                          !selectedSubjectId
                            ? "Select Subject first ▼"
                            : availableChapters.length === 0
                            ? "No chapters yet. Click [+ Add Chapter] ▼"
                            : "Select Chapter / Unit ▼"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-[60]">
                      {availableChapters.map((chap) => (
                        <SelectItem key={chap.id} value={chap.id} className="text-xs cursor-pointer">
                          {chap.name.startsWith("Unit") || chap.name.startsWith("Chapter")
                            ? chap.name
                            : `Unit ${chap.number} — ${chap.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Action Buttons: [ CANCEL ] [ UPLOAD MATERIAL ] */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none text-xs uppercase tracking-wider font-semibold px-5"
                  onClick={() => setPendingFile(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-none text-xs uppercase tracking-wider font-semibold px-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  disabled={!selectedSubjectId || !selectedChapterId}
                  onClick={handleConfirmUpload}
                >
                  Upload Material
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 16. AI PROCESSING STATUS DIALOG */}
      {/* ============================================================ */}
      <Dialog open={isProcessing} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm rounded-xl p-6 text-center border border-border bg-card shadow-soft font-sans">
          <div className="flex flex-col items-center justify-center space-y-3 py-3">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
            <DialogTitle className="font-display text-base font-semibold text-foreground">
              Analyzing the document…
            </DialogTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Uploading and organizing content into your selected Subject & Chapter hierarchy.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Detail Modal */}
      <MaterialDetailDialog
        material={activeMaterial}
        open={Boolean(activeMaterial)}
        onOpenChange={(open) => {
          if (!open) setActiveMaterial(null);
        }}
      />
    </>
  );
}
