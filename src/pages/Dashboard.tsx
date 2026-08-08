import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnalyticsView } from "@/components/app/AnalyticsView";
import { HomeView } from "@/components/app/HomeView";
import { ResultView } from "@/components/app/ResultView";
import { SubjectsView } from "@/components/app/SubjectsView";
import { TestSetupDialog } from "@/components/app/TestSetupDialog";
import { TestView } from "@/components/app/TestView";
import { TopicsView } from "@/components/app/TopicsView";
import { WeakView } from "@/components/app/WeakView";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Flame,
  Home,
  LogOut,
  Trophy,
  Zap,
} from "lucide-react";
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
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const stats = useQuery(api.queries.userStats);
  const seed = useMutation(api.tests.seedIfEmpty);
  const startTestMutation = useMutation(api.tests.startTest);
  const submitTestMutation = useMutation(api.tests.submitTest);

  const [view, setView] = useState<View>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
      openConfig({ mode: t.mode as "weak" | "hard" });
    } else if (t.mode === "normal" && t.topic) {
      openConfig({ mode: "normal", category: t.category, topic: t.topic });
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
  const startTopic = (topic: string, count: number) =>
    openConfig({ mode: "normal", category: selectedCategory ?? undefined, topic }, count);
  const startAll = () =>
    openConfig({ mode: "all", category: selectedCategory ?? undefined });

  const goTo = (next: View) => {
    if (next === "subjects") {
      setSelectedCategory(null);
      setView("subjects");
    } else {
      setView(next);
    }
  };

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
            {NAV_ITEMS.map((n) => (
              <button
                key={n.view}
                onClick={() => goTo(n.view)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  view === n.view
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
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
                onStartTopic={startTopic}
                onStartAll={startAll}
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

      {/* ================= MOBILE BOTTOM NAV ================= */}
      {view !== "test" && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
          <div className="flex items-stretch justify-around">
            {NAV_ITEMS.map((n) => {
              const active =
                n.view === "subjects" || n.view === "topics"
                  ? view === "subjects" || view === "topics"
                  : view === n.view;
              return (
                <button
                  key={n.view}
                  onClick={() => goTo(n.view)}
                  className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <n.icon className="size-5" />
                  {n.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

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
