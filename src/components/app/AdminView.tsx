import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  CheckCircle2,
  Database,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initials, subjectMeta } from "@/lib/test";

interface AdminViewProps {
  onBack: () => void;
}

type PendingDelete =
  | { kind: "question"; id: string; label: string }
  | { kind: "topic"; category: string; topic: string; label: string }
  | { kind: "category"; category: string; label: string }
  | null;

export function AdminView({ onBack }: AdminViewProps) {
  const overview = useQuery(api.admin.adminOverview);
  const users = useQuery(api.admin.adminUsers);
  const questions = useQuery(api.admin.adminQuestions, { category: undefined });
  const setBanned = useMutation(api.admin.setBanned);
  const deleteQuestion = useMutation(api.admin.deleteQuestion);
  const deleteTopic = useMutation(api.admin.deleteTopic);
  const deleteCategory = useMutation(api.admin.deleteCategory);
  const addQuestion = useMutation(api.admin.addQuestion);

  const [tab, setTab] = useState("overview");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDelete>(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // ---------- question groups by category/topic ----------
  const groups = useMemo(() => {
    type Q = NonNullable<typeof questions>[number];
    const byCat = new Map<string, Map<string, Q[]>>();
    for (const q of questions ?? []) {
      const byTopic = byCat.get(q.category) ?? new Map();
      const list = byTopic.get(q.topic) ?? [];
      list.push(q);
      byTopic.set(q.topic, list);
      byCat.set(q.category, byTopic);
    }
    return [...byCat.entries()].map(([category, byTopic]) => ({
      category,
      topics: [...byTopic.entries()].map(([topic, list]) => ({ topic, list })),
    }));
  }, [questions]);

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    try {
      if (pending.kind === "question") {
        await deleteQuestion({ questionId: pending.id as Id<"questions"> });
      } else if (pending.kind === "topic") {
        await deleteTopic({ category: pending.category, topic: pending.topic });
      } else {
        await deleteCategory({ category: pending.category });
      }
      toast.success(`${pending.label} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setPending(null);
    }
  };

  const toggleBan = async (userId: string, currentlyBanned: boolean) => {
    setBusyUserId(userId);
    try {
      await setBanned({ userId: userId as Id<"users">, banned: !currentlyBanned });
      toast.success(currentlyBanned ? "User unbanned" : "User banned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyUserId(null);
    }
  };

  const stats = [
    { icon: Users, label: "Registered users", value: overview?.users, tint: "text-indigo-500 bg-indigo-500/10" },
    { icon: BookOpen, label: "Questions", value: overview?.questions, tint: "text-amber-500 bg-amber-500/10" },
    { icon: CheckCircle2, label: "Tests taken", value: overview?.attempts, tint: "text-emerald-500 bg-emerald-500/10" },
    { icon: Ban, label: "Banned users", value: overview?.banned, tint: "text-rose-500 bg-rose-500/10" },
    { icon: Database, label: "Categories", value: overview?.categories, tint: "text-sky-500 bg-sky-500/10" },
    { icon: ShieldCheck, label: "Topics", value: overview?.topics, tint: "text-violet-500 bg-violet-500/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Dashboard
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Super-admin · full control
          </p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-black tracking-tight">
            Admin panel{" "}
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-md shadow-violet-600/30">
              <ShieldCheck className="size-3.5" /> Admin
            </span>
          </h1>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/25 hover:from-violet-700 hover:to-fuchsia-700"
        >
          <Plus className="size-4" /> Add question
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="bank">Question bank</TabsTrigger>
        </TabsList>

        {/* ---------- OVERVIEW ---------- */}
        <TabsContent value="overview">
          {overview === undefined ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border bg-card p-4 shadow-sm"
                >
                  <div className={`grid size-9 place-items-center rounded-xl ${s.tint}`}>
                    <s.icon className="size-4" />
                  </div>
                  <div className="mt-3 text-2xl font-black tabular-nums">
                    {s.value ?? "—"}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------- USERS ---------- */}
        <TabsContent value="users">
          {users === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              No registered users yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {users.map((u, i) => (
                <motion.div
                  key={u.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-sm"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-extrabold text-white">
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold">{u.name}</span>
                      {u.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/15 px-2 py-0.5 text-[10px] font-black uppercase text-violet-600 dark:text-violet-300">
                          <ShieldCheck className="size-3" /> Admin
                        </span>
                      )}
                      {u.banned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
                          <Ban className="size-3" /> Banned
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-sm font-black tabular-nums">
                      Lv {u.level} · {u.xp} XP
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {u.tests} tests · {u.streak}-day streak
                    </div>
                  </div>
                  <Button
                    variant={u.banned ? "outline" : "destructive"}
                    size="sm"
                    disabled={u.isAdmin || busyUserId === u.userId}
                    onClick={() => toggleBan(u.userId, u.banned)}
                    className="shrink-0 gap-1.5"
                  >
                    {u.banned ? <Unlock className="size-3.5" /> : <Ban className="size-3.5" />}
                    {u.banned ? "Unban" : "Ban"}
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------- QUESTION BANK ---------- */}
        <TabsContent value="bank">
          {questions === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((g) => (
                <section key={g.category} className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br ${subjectMeta(g.category).gradient} text-base shadow`}
                      >
                        {subjectMeta(g.category).emoji}
                      </span>
                      <div>
                        <h3 className="font-extrabold">{g.category}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {g.topics.reduce((n, t) => n + t.list.length, 0)} questions ·{" "}
                          {g.topics.length} topics
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                      onClick={() =>
                        setPending({
                          kind: "category",
                          category: g.category,
                          label: `category “${g.category}”`,
                        })
                      }
                    >
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  </div>

                  <div className="divide-y">
                    {g.topics.map((t) => (
                      <div key={t.topic} className="px-4 py-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                            <BookOpen className="size-3.5 text-muted-foreground" />
                            {t.topic}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {t.list.length}
                            </span>
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                            onClick={() =>
                              setPending({
                                kind: "topic",
                                category: g.category,
                                topic: t.topic,
                                label: `topic “${t.topic}”`,
                              })
                            }
                          >
                            <Trash2 className="size-3.5" /> Delete topic
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {t.list.map((q) => (
                            <div
                              key={q.id}
                              className="group flex items-start gap-2 rounded-xl border bg-background px-3 py-2.5"
                            >
                              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-black text-muted-foreground">
                                {String.fromCharCode(65 + q.correct)}
                              </span>
                              <p className="flex-1 text-sm font-medium leading-snug">
                                {q.question}
                              </p>
                              <button
                                onClick={() =>
                                  setPending({
                                    kind: "question",
                                    id: q.id,
                                    label: "question",
                                  })
                                }
                                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                                aria-label="Delete question"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ---------- ADD QUESTION DIALOG ---------- */}
      <AddQuestionDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addQuestion} />

      {/* ---------- DELETE CONFIRM ---------- */}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pending?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {pending?.label} and any linked weak-question
              history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="gap-2 bg-rose-500 hover:bg-rose-600"
            >
              <Trash2 className="size-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

/* ================= Add question form ================= */

function AddQuestionDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (args: {
    category: string;
    topic: string;
    question: string;
    options: string[];
    correct: number;
    explanation?: string;
  }) => Promise<{ ok: boolean; id?: unknown }>;
}) {
  const [category, setCategory] = useState("");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCategory("");
    setTopic("");
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrect(0);
    setExplanation("");
    setError(null);
  };

  const submit = async () => {
    setError(null);
    const filled = options.filter((o) => o.trim());
    if (!category.trim() || !topic.trim() || !question.trim()) {
      setError("Category, topic and question text are required.");
      return;
    }
    if (filled.length < 2) {
      setError("At least 2 answer options are required.");
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        category: category.trim(),
        topic: topic.trim(),
        question: question.trim(),
        options: filled,
        correct,
        explanation: explanation.trim() || undefined,
      });
      toast.success("Question added ✨");
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add question.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : onOpenChange(false))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-4 text-violet-500" /> Add a question
          </DialogTitle>
          <DialogDescription>
            New categories and topics are created automatically if they don't exist yet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="GK" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Topic</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="World Geography" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold">Question</label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What is the capital of India?"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold">Options</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  onClick={() => setCorrect(i)}
                  className={`grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border text-xs font-black transition-colors ${
                    correct === i
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground hover:border-primary/40"
                  }`}
                  title="Set as correct answer"
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Tap a letter to mark the correct answer.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold">Explanation (optional)</label>
            <Input
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Why is this the right answer?"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className="gap-2">
            {saving ? "Saving…" : "Add question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

