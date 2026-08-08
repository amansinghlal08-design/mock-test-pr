import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Download,
  FileJson,
  FolderPlus,
  KeyRound,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
  category?: string;
  topic?: string;
}

const SAMPLE_JSON = `[
  {
    "question": "Which planet is closest to the Sun?",
    "options": ["Venus", "Mercury", "Mars", "Earth"],
    "correct": 1,
    "explanation": "Mercury is closest to the Sun."
  }
]`;

function SuccessPanel({ title, sub }: { title: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
      className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3"
    >
      <motion.span
        initial={{ scale: 0, rotate: -120 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 14, delay: 0.08 }}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
      >
        <Check className="size-4" strokeWidth={3} />
      </motion.span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
          {title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </motion.div>
  );
}

function RunningPanel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-muted px-4 py-3">
      <span className="size-9 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      <p className="text-sm font-bold">{label}</p>
    </div>
  );
}

export function ImportExportDialog({ open, onOpenChange }: ImportExportDialogProps) {
  // ---------- destination state ----------
  const [catMode, setCatMode] = useState<"existing" | "new">("existing");
  const [selectedCat, setSelectedCat] = useState("");

  const categories = useQuery(api.queries.categories);
  // Only fetch topics once a concrete (existing) category is chosen.
  const topics = useQuery(
    api.queries.topics,
    catMode === "existing" && selectedCat ? { category: selectedCat } : "skip",
  );
  const [newCat, setNewCat] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);
  const [lockedTopic, setLockedTopic] = useState<string | null>(null);

  // ---------- access gate ----------
  const [granted, setGranted] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [key, setKey] = useState("");
  const [keyError, setKeyError] = useState(false);

  // ---------- import state ----------
  const [json, setJson] = useState("");
  const [importPhase, setImportPhase] = useState<"idle" | "running" | "done">("idle");
  const [importResult, setImportResult] = useState<{ imported: number; duplicates: number; skipped: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---------- export state ----------
  const [exportPhase, setExportPhase] = useState<"idle" | "running" | "done">("idle");

  const importMutation = useMutation(api.tests.importQuestions);
  const exportMutation = useMutation(api.tests.exportQuestions);

  // Reset transient state whenever the dialog opens/closes.
  useEffect(() => {
    if (!open) return;
    setCatMode("existing");
    setSelectedCat("");
    setNewCat("");
    setSelectedTopic("");
    setNewTopic("");
    setAddingTopic(false);
    setLockedTopic(null);
    setGranted(false);
    setShowKey(false);
    setKey("");
    setKeyError(false);
    setJson("");
    setImportPhase("idle");
    setImportResult(null);
    setExportPhase("idle");
    setFormError(null);
  }, [open]);

  // Default the category to the first available one.
  useEffect(() => {
    if (open && catMode === "existing" && !selectedCat && categories && categories.length > 0) {
      setSelectedCat(categories[0].category);
    }
  }, [open, catMode, selectedCat, categories]);

  const isNewCategory = catMode === "new";
  const effectiveCategory = isNewCategory ? newCat.trim() : selectedCat;
  const effectiveTopic = lockedTopic ?? (isNewCategory ? newTopic.trim() : selectedTopic);

  const handleCatMode = (mode: "existing" | "new") => {
    setCatMode(mode);
    setSelectedTopic("");
    setLockedTopic(null);
    setNewTopic("");
    setAddingTopic(false);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCat(cat);
    setSelectedTopic("");
    setLockedTopic(null);
    setAddingTopic(false);
  };

  const lockNewTopic = () => {
    const name = newTopic.trim();
    if (!name) return;
    setLockedTopic(name);
    setNewTopic("");
    setAddingTopic(false);
    toast("✨ New topic created — locked as destination.");
  };

  const parseJson = (): ParsedQuestion[] | null => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        setFormError("JSON must be an array of questions.");
        return null;
      }
      return parsed as ParsedQuestion[];
    } catch {
      setFormError("Invalid JSON — check your syntax and try again.");
      return null;
    }
  };

  const handleImport = async () => {
    setFormError(null);
    if (!effectiveCategory) {
      setFormError("Pick a destination category first.");
      return;
    }
    if (!effectiveTopic) {
      setFormError("Pick or create a destination topic first.");
      return;
    }
    if (!json.trim()) {
      setFormError("Paste the questions JSON or choose a file first.");
      return;
    }
    const questions = parseJson();
    if (!questions) return;

    // First click reveals the access-key field; the next click runs the import.
    if (!granted && !showKey) {
      setShowKey(true);
      setKeyError(false);
      return;
    }

    setImportPhase("running");
    try {
      const res = await importMutation({
        password: key,
        category: effectiveCategory,
        topic: effectiveTopic,
        questions,
      });
      if (!res.ok) {
        setKeyError(true);
        setKey("");
        setImportPhase("idle");
        return;
      }
      setGranted(true);
      setImportResult({
        imported: res.imported,
        duplicates: res.duplicates,
        skipped: res.skipped,
      });
      setImportPhase("done");
      toast.success(
        `${res.imported} question${res.imported === 1 ? "" : "s"} imported into “${effectiveTopic}”`,
      );
    } catch (e) {
      console.error(e);
      setImportPhase("idle");
      setFormError("Something went wrong — please try again.");
    }
  };

  const handleExport = async () => {
    setFormError(null);
    if (!granted && !showKey) {
      setShowKey(true);
      setKeyError(false);
      return;
    }
    setExportPhase("running");
    try {
      const res = await exportMutation({ password: key });
      if (!res.ok) {
        setKeyError(true);
        setKey("");
        setExportPhase("idle");
        return;
      }
      setGranted(true);
      const blob = new Blob([JSON.stringify(res.questions, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mocktest-questions-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportPhase("done");
      toast.success(`${res.questions.length} questions exported`);
    } catch (e) {
      console.error(e);
      setExportPhase("idle");
      setFormError("Something went wrong — please try again.");
    }
  };

  const unlockButton = (
    label: string,
    onClick: () => void,
    running: boolean,
  ) => (
    <Button
      className="w-full gap-2"
      onClick={onClick}
      disabled={running || !key.trim()}
    >
      {running ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Working…
        </>
      ) : (
        <>
          <KeyRound className="size-4" /> {label}
        </>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="mb-1 grid size-11 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
            <Upload className="size-5" />
          </div>
          <DialogTitle className="text-xl">Question bank</DialogTitle>
          <DialogDescription>
            Bulk-import JSON question sets or download the full bank.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              <Upload className="mr-1.5 size-3.5" /> Import
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="mr-1.5 size-3.5" /> Export
            </TabsTrigger>
          </TabsList>

          {/* ===================== IMPORT ===================== */}
          <TabsContent value="import" className="space-y-4">
            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Category</label>
              <div className="flex items-center gap-2">
                {catMode === "existing" ? (
                  <select
                    value={selectedCat}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="h-11 flex-1 rounded-xl border bg-background px-3 text-sm font-medium outline-none transition-[border,box-shadow] focus:border-primary focus:ring-3 focus:ring-primary/20"
                  >
                    {categories === undefined && <option value="">Loading…</option>}
                    {categories?.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category} · {c.count} questions
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    placeholder="New category name"
                    className="h-11 flex-1"
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 shrink-0"
                  onClick={() => handleCatMode(catMode === "existing" ? "new" : "existing")}
                >
                  {catMode === "existing" ? (
                    <>
                      <Plus className="size-4" /> New
                    </>
                  ) : (
                    <>
                      <X className="size-4" /> Use existing
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Destination topic */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Destination topic
              </label>
              {isNewCategory ? (
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Topic for the new category"
                  className="h-11"
                />
              ) : lockedTopic ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5">
                  <Sparkles className="size-4 shrink-0 text-emerald-500" />
                  <span className="flex-1 truncate text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    ✨ New Created! {lockedTopic}
                  </span>
                  <button
                    onClick={() => setLockedTopic(null)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Change topic"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="h-11 flex-1 rounded-xl border bg-background px-3 text-sm font-medium outline-none transition-[border,box-shadow] focus:border-primary focus:ring-3 focus:ring-primary/20"
                    >
                      {topics === undefined && <option value="">Loading…</option>}
                      {topics === undefined || topics.length === 0 ? (
                        <option value="">No topics yet</option>
                      ) : (
                        <>
                          <option value="">Choose a topic…</option>
                          {topics.map((t) => (
                            <option key={t.topic} value={t.topic}>
                              {t.topic} · {t.count} questions
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 shrink-0"
                      onClick={() => setAddingTopic((v) => !v)}
                    >
                      <FolderPlus className="size-4" /> New
                    </Button>
                  </div>
                  {addingTopic && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 flex items-center gap-2"
                    >
                      <Input
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            lockNewTopic();
                          }
                        }}
                        placeholder="New topic name"
                        className="h-11 flex-1"
                      />
                      <Button
                        size="sm"
                        className="h-11 shrink-0"
                        onClick={lockNewTopic}
                        disabled={!newTopic.trim()}
                      >
                        <Plus className="size-4" /> Add
                      </Button>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* JSON */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Questions JSON
              </label>
              <Textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                placeholder={SAMPLE_JSON}
                className="min-h-44 resize-y font-mono text-xs"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  Fields: question · options[] · correct · explanation (optional)
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileJson className="size-3.5" /> Choose file
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setJson(await f.text());
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Access key gate */}
            <AnimatePresence>
              {showKey && !granted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border bg-muted/50 p-3.5">
                    <label className="mb-1.5 block text-sm font-semibold">
                      Access key
                    </label>
                    <Input
                      type="password"
                      value={key}
                      onChange={(e) => {
                        setKey(e.target.value);
                        setKeyError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleImport();
                        }
                      }}
                      placeholder="••••••"
                      className={`h-11 ${keyError ? "border-destructive" : ""}`}
                      autoFocus
                    />
                    {keyError && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-destructive">
                        <AlertCircle className="size-3.5" /> Access denied.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {formError && importPhase !== "done" && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertCircle className="size-3.5" /> {formError}
              </p>
            )}

            {importPhase === "done" && importResult ? (
              <>
                <SuccessPanel
                  title="Questions imported successfully"
                  sub={`${importResult.imported} added · ${importResult.duplicates} duplicates skipped · ${importResult.skipped} invalid`}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setJson("");
                    setImportPhase("idle");
                    setImportResult(null);
                  }}
                >
                  Import another set
                </Button>
              </>
            ) : importPhase === "running" ? (
              <RunningPanel label="Importing questions…" />
            ) : showKey && !granted ? (
              unlockButton("Unlock & import", handleImport, false)
            ) : (
              <Button className="w-full gap-2" onClick={handleImport}>
                <Upload className="size-4" /> Import questions
              </Button>
            )}
          </TabsContent>

          {/* ===================== EXPORT ===================== */}
          <TabsContent value="export" className="space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <div className="grid size-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                <Download className="size-5" />
              </div>
              <h4 className="mt-3 font-extrabold">Download the full bank</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Everything — every category and topic — as a JSON file you can
                re-import anywhere.
              </p>
            </div>

            <AnimatePresence>
              {showKey && !granted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border bg-muted/50 p-3.5">
                    <label className="mb-1.5 block text-sm font-semibold">
                      Access key
                    </label>
                    <Input
                      type="password"
                      value={key}
                      onChange={(e) => {
                        setKey(e.target.value);
                        setKeyError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleExport();
                        }
                      }}
                      placeholder="••••••"
                      className={`h-11 ${keyError ? "border-destructive" : ""}`}
                      autoFocus
                    />
                    {keyError && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-destructive">
                        <AlertCircle className="size-3.5" /> Access denied.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {formError && exportPhase !== "done" && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <AlertCircle className="size-3.5" /> {formError}
              </p>
            )}

            {exportPhase === "done" ? (
              <SuccessPanel
                title="Export ready — check your downloads"
                sub="The full question bank was saved as a JSON file."
              />
            ) : exportPhase === "running" ? (
              <RunningPanel label="Preparing export…" />
            ) : showKey && !granted ? (
              unlockButton("Unlock & export", handleExport, false)
            ) : (
              <Button className="w-full gap-2" onClick={handleExport}>
                <Download className="size-4" /> Export all questions
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
