import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminView } from "@/components/app/AdminView";
import { AnalyticsView } from "@/components/app/AnalyticsView";
import { ChunksView } from "@/components/app/ChunksView";
import { HomeView } from "@/components/app/HomeView";
import { ImportExportDialog } from "@/components/app/ImportExportDialog";
import { LeaderboardView } from "@/components/app/LeaderboardView";
import { ResultView } from "@/components/app/ResultView";
import { SubjectsView } from "@/components/app/SubjectsView";
import { TestSetupDialog } from "@/components/app/TestSetupDialog";
import { TestView } from "@/components/app/TestView";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { TopicsView } from "@/components/app/TopicsView";
import { WeakView } from "@/components/app/WeakView";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Database,
  Flame,
  Home,
  LogOut,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";

const ADMIN_EMAIL = "amansinghlal08@gmail.com";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { ActiveTest, TestConfig, TestSummary, View } from "@/lib/test";
import { initials } from "@/lib/test";

const NAV_ITEMS: { view: View; label: string; icon: typeof Home }[] = [
  { view: "home", label: "Home", icon: Home },
  { view: "subjects", label: "Test", icon: BookOpen },
  { view: "weak", label: "Weak", icon: Flame },
  { view: "analytics", label: "Stats", icon: BarChart3 },
  { view: "leaderboard", label: "Rank", icon: Trophy },
];

const ADMIN_ITEM: { view: View; label: string; icon: typeof Home } = {
  view: "admin",
  label: "Admin",
  icon: ShieldCheck,
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const navigate = useNavigate();
  const stats = useQuery(api.queries.userStats);
  const seed = useMutation(api.tests.seedIfEmpty);
  const startTestMutation = useMutation(api.tests.startTest);
  const submitTestMutation = useMutation(api.tests.submitTest);

  const [view, setView] = useState<View>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<{
    topic: string;
    count: number;
  } | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [configAvailable, setConfigAvailable] = useState(20);
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<ActiveTest | null>(null);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [starting, setStarting] = useState(false);
  const submittingRef = useRef(false);
  const seededRef = useRef(false);

  // Seed the starter question bank once per session.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    seed().catch((e) => console.error("Seeding failed:", e));
  }, [seed]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // ---------- test flow ----------
  const openConfig = useCallback(
    (next: TestConfig, available?: number) => {
      setConfig(next);
      setConfigAvailable(available ?? 20);
      setConfigOpen(true);
    },
    [],
  );

  const handleConfirmConfig = useCallback(
    async (cfg: TestConfig, limit: number) => {
      setConfigOpen(false);
      setStarting(true);
      try {
        const res = await startTestMutation({
          category: cfg.category,
          topic: cfg.topic,
          mode: cfg.mode,
          limit,
          chunk: cfg.chunk,
          chunkSize: 20,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setActiveTest({
          questions: res.questions,
          answers: new Array(res.questions.length).fill(null),
          currentIdx: 0,
          startAt: Date.now(),
          timerSec: res.timerSec,
          mode: res.mode,
          category: cfg.category ?? res.questions[0]?.category ?? "Mixed",
          topic: cfg.topic ?? "",
          chunk: cfg.chunk,
        });
        setSummary(null);
        setView("test");
      } catch (e) {
        console.error(e);
        toast.error("Could not start the test. Please try again.");
      } finally {
        setStarting(false);
      }
    },
    [startTestMutation],
  );

  const patchTest = useCallback((patch: Partial<ActiveTest>) => {
    setActiveTest((t) => (t ? { ...t, ...patch } : t));
  }, []);

  const handleAnswer = useCallback(
    (idx: number, selected: number) => {
      setActiveTest((t) => {
        if (!t) return t;
        const answers = [...t.answers];
        answers[idx] = selected;
        return { ...t, answers };
      });
    },
    [],
  );

  const handleFinish = useCallback(
    async (timeIsUp: boolean) => {
      const t = activeTest;
      if (!t || submittingRef.current) return;
      submittingRef.current = true;
      try {
        const timeSec = Math.floor((Date.now() - t.startAt) / 1000);
        const res = await submitTestMutation({
          answers: t.questions.map((q, i) => ({
            questionId: q.id,
            selected: t.answers[i],
            // Echo the shuffled correct index so scoring matches the order the
            // user saw (options are shuffled per test in startTest).
            correct: q.correct,
          })),
          category: t.category,
          topic: t.topic,
          mode: t.mode,
          timeSec,
        });
        setSummary(res);
        setTimeUp(timeIsUp);
        setView("result");
        if (res.isLevelUp) toast.success(`Level up! You're now Level ${res.newLevel} 🎉`);
        else if (res.xpEarned > 0) toast.success(`+${res.xpEarned} XP earned`);
      } catch (e) {
        console.error(e);
        toast.error("Could not submit the test. Please try again.");
      } finally {
        submittingRef.current = false;
      }
    },
    [activeTest, submitTestMutation],
  );

  const handleRetake = useCallback(() => {
    const t = activeTest;
    if (!t) return;
    if (t.mode === "weak" || t.mode === "hard") {
      openConfig({ mode: t.mode as "weak" | "hard" }, stats?.weakCount ?? 20);
    } else if (t.mode === "normal" && t.topic) {
      if (t.chunk) {
        openConfig(
          { mode: "normal", category: t.category, topic: t.topic, chunk: t.chunk },
          20,
        );
      } else {
        openConfig({ mode: "normal", category: t.category, topic: t.topic });
      }
    } else {
      openConfig({ mode: "all", category: t.category });
    }
  }, [activeTest, openConfig]);

  const handleQuit = useCallback(() => {
    setActiveTest(null);
    setView("home");
  }, []);

  // ---------- navigation helpers ----------
  const goHome = () => setView("home");
  const goSubjects = () => setView("subjects");

  /** Open a weak/hard drill, explaining when there's nothing to practice. */
  const openDrillConfig = useCallback(
    (mode: "weak" | "hard") => {
      if (stats && stats.weakCount === 0) {
        toast.info(
          mode === "hard"
            ? "Nothing to drill yet — no questions missed twice."
            : "No weak questions yet — take a test first!",
        );
        return;
      }
      openConfig({ mode }, stats?.weakCount ?? 20);
    },
    [openConfig, stats],
  );
  const openTopic = (topic: string, count: number) => {
    setSelectedTopic({ topic, count });
    setView("chunks");
  };
  const startChunk = (chunkIndex: number, size: number) =>
    openConfig(
      {
        mode: "normal",
        category: selectedCategory ?? undefined,
        topic: selectedTopic?.topic,
        chunk: chunkIndex,
      },
      size,
    );
  const startFullTopic = () => {
    if (!selectedTopic) return;
    openConfig(
      {
        mode: "normal",
        category: selectedCategory ?? undefined,
        topic: selectedTopic.topic,
      },
      selectedTopic.count,
    );
  };
  const startAll = () =>
    openConfig({ mode: "all", category: selectedCategory ?? undefined });

  const goTo = (next: View) => {
    if (next === "subjects") {
      setSelectedCategory(null);
      setSelectedTopic(null);
      setView("subjects");
    } else {
      setView(next);
    }
  };

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;
  const userName = user?.name || user?.email?.split("@")[0] || "Student";

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* ambient background */}
      <div className="pointer-events-none fixed -left-40 top-24 size-[420px] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed -right-40 bottom-24 size-[420px] rounded-full bg-amber-400/10 blur-[120px]" />

      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <button
            onClick={goHome}
            className="flex items-center gap-2.5"
            aria-label="MockTest.pro home"
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30">
              M
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              MockTest<span className="text-amber-500">.pro</span>
            </span>
          </button>

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((n) => (
              <button
                key={n.view}
                onClick={() => goTo(n.view)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  view === n.view
                    ? "bg-primary/10 text-primary"
                    : n.view === "admin"
                      ? "text-violet-500 hover:bg-violet-500/10 hover:text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => goTo("leaderboard")}
              className="hidden size-8 items-center justify-center rounded-full border bg-card transition-all hover:-translate-y-0.5 hover:border-amber-400/60 hover:shadow-md sm:inline-flex"
              aria-label="Leaderboard"
              title="Leaderboard"
            >
              <Trophy className="size-4 text-amber-500" />
            </button>
            <span className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold sm:inline-flex">
              <Trophy className="size-3.5 text-amber-500" />
              Level {stats?.level ?? 1}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-bold sm:inline-flex">
              <Zap className="size-3.5 text-indigo-500" />
              {stats?.xp ?? 0} XP
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 transition-colors hover:border-primary/40"
                  aria-label="Account menu"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-extrabold text-white">
                    {initials(userName)}
                  </span>
                  <span className="hidden max-w-28 truncate text-sm font-bold sm:block">
                    {userName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
                  <p className="truncate font-bold">{user?.email ?? userName}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={goHome} className="cursor-pointer">
                  <Home className="mr-2 size-4" /> Home
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => goTo("admin")}
                    className="cursor-pointer text-violet-600 focus:text-violet-600 dark:text-violet-400"
                  >
                    <ShieldCheck className="mr-2 size-4" /> Admin panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setBankOpen(true)} className="cursor-pointer">
                  <Database className="mr-2 size-4" /> Manage question bank
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="relative px-5 pb-28 pt-8 md:pb-16">
        <AnimatePresence mode="wait">
          {view === "test" && activeTest ? (
            <motion.div
              key="test"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-2xl"
            >
              <TestView
                test={activeTest}
                onAnswer={handleAnswer}
                onJump={(i) => patchTest({ currentIdx: i })}
                onPrev={() => patchTest({ currentIdx: Math.max(0, activeTest.currentIdx - 1) })}
                onNext={() =>
                  patchTest({
                    currentIdx: Math.min(activeTest.questions.length - 1, activeTest.currentIdx + 1),
                  })
                }
                onFinish={() => void handleFinish(false)}
                onQuit={handleQuit}
                onTimeUp={() => void handleFinish(true)}
              />
            </motion.div>
          ) : view === "result" && summary && activeTest ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ResultView
                test={activeTest}
                summary={summary}
                timeUp={timeUp}
                onRetake={handleRetake}
                onHome={goHome}
              />
            </motion.div>
          ) : view === "subjects" ? (
            <motion.div key="subjects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SubjectsView onSelect={(cat) => { setSelectedCategory(cat); setView("topics"); }} />
            </motion.div>
          ) : view === "topics" && selectedCategory ? (
            <motion.div key="topics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TopicsView
                category={selectedCategory}
                onBack={goSubjects}
                onOpenTopic={openTopic}
                onStartAll={startAll}
              />
            </motion.div>
          ) : view === "chunks" && selectedCategory && selectedTopic ? (
            <motion.div key="chunks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ChunksView
                category={selectedCategory}
                topic={selectedTopic.topic}
                count={selectedTopic.count}
                onBack={() => setView("topics")}
                onStartChunk={startChunk}
                onStartFull={startFullTopic}
              />
            </motion.div>
          ) : view === "weak" ? (
            <motion.div key="weak" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WeakView
                onBack={goHome}
                onPractice={() => openDrillConfig("weak")}
              />
            </motion.div>
          ) : view === "analytics" ? (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnalyticsView onBack={goHome} />
            </motion.div>
          ) : view === "leaderboard" ? (
            <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LeaderboardView onBack={goHome} />
            </motion.div>
          ) : view === "admin" && isAdmin ? (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AdminView onBack={goHome} />
            </motion.div>
          ) : (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HomeView
                userName={userName}
                onTakeTest={goSubjects}
                onOpenWeak={openDrillConfig}
                onGoWeak={() => setView("weak")}
                onGoAnalytics={() => setView("analytics")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ================= TEST SETUP DIALOG ================= */}
      <TestSetupDialog
        open={configOpen && view !== "test"}
        onOpenChange={setConfigOpen}
        config={config}
        available={configAvailable}
        onConfirm={handleConfirmConfig}
      />

      {/* ================= QUESTION BANK (IMPORT/EXPORT) ================= */}
      <ImportExportDialog open={bankOpen} onOpenChange={setBankOpen} />

      {/* ================= MOBILE BOTTOM NAV ================= */}
      {view !== "test" && (
        <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around rounded-2xl border bg-background/85 shadow-2xl shadow-foreground/10 backdrop-blur-xl">
            {navItems.map((n) => {
              const active =
                n.view === "subjects" || n.view === "topics" || n.view === "chunks"
                  ? view === "subjects" || view === "topics" || view === "chunks"
                  : view === n.view;
              return (
                <button
                  key={n.view}
                  onClick={() => goTo(n.view)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-bold transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`grid size-8 place-items-center rounded-xl transition-colors ${
                      active ? "bg-primary/15" : ""
                    }`}
                  >
                    <n.icon className="size-5" />
                  </span>
                  {n.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* ================= DEVELOPER CREDIT ================= */}
      <footer className="pb-28 pt-6 text-center md:pb-8">
        <p className="text-xs font-medium text-muted-foreground/70">
          Built with <span className="text-rose-500">♥</span> for students ·{" "}
          <span className="font-bold text-foreground/80">Powered by Rajnish</span>
        </p>
      </footer>

      {/* starting overlay */}
      {starting && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-8 py-6 shadow-xl">
            <div className="size-9 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
            <p className="text-sm font-bold">Building your test…</p>
          </div>
        </div>
      )}
    </div>
  );
}
