import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Flame,
  Plus,
  Timer,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { formatClock, formatDate, subjectMeta } from "@/lib/test";
import { Skeleton } from "@/components/ui/skeleton";

interface HomeViewProps {
  userName?: string | null;
  onTakeTest: () => void;
  onOpenWeak: (mode: "weak" | "hard") => void;
  onGoWeak: () => void;
  onGoAnalytics: () => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export function HomeView({ userName, onTakeTest, onOpenWeak, onGoWeak, onGoAnalytics }: HomeViewProps) {
  const stats = useQuery(api.queries.userStats);
  const recent = useQuery(api.queries.recentAttempts, { limit: 6 });
  const loading = stats === undefined || recent === undefined;

  const firstName = userName?.trim().split(/\s+/)[0] || "Champion";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-4xl space-y-8"
    >
      {/* Greeting / XP banner */}
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-7 text-white shadow-xl shadow-indigo-600/25"
      >
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_80%_90%_at_70%_20%,black,transparent)]" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-indigo-100/80">
              नमस्ते — welcome back
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Hi, {firstName} 👋
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <Flame className="size-3.5 text-amber-300" />
                {stats?.streak ?? 0}-day streak
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <Trophy className="size-3.5 text-amber-300" />
                Level {stats?.level ?? 1}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <TrendingUp className="size-3.5 text-emerald-300" />
                {stats?.avgPct ?? 0}% avg
              </span>
            </div>
          </div>

          <div className="min-w-56 flex-1 sm:max-w-xs">
            <div className="flex items-end justify-between text-sm">
              <span className="font-bold">Level {stats?.level ?? 1}</span>
              <span className="font-mono text-indigo-100/90 tabular-nums">
                {(stats?.xp ?? 0) % 100} / 100 XP
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all duration-700"
                style={{ width: `${(stats?.xp ?? 0) % 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-indigo-100/80">
              {stats?.xp ?? 0} XP total · 10 XP per correct answer
            </p>
          </div>
        </div>
      </motion.section>

      {/* Quick stats */}
      <motion.section
        variants={item}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          { icon: BookOpen, label: "Questions", value: stats?.totalQuestions, tint: "text-indigo-500 bg-indigo-500/10" },
          { icon: Timer, label: "Tests taken", value: stats?.totalTests, tint: "text-amber-500 bg-amber-500/10" },
          { icon: TrendingUp, label: "Avg accuracy", value: stats ? `${stats.avgPct}%` : "—", tint: "text-emerald-500 bg-emerald-500/10" },
          { icon: Brain, label: "Weak spots", value: stats?.weakCount, tint: "text-rose-500 bg-rose-500/10" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`grid size-9 place-items-center rounded-xl ${s.tint}`}>
              <s.icon className="size-4" />
            </div>
            <div className="mt-3 text-2xl font-black tabular-nums">
              {loading ? <Skeleton className="h-7 w-10" /> : s.value}
            </div>
            <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </motion.section>

      {/* Quick actions */}
      <motion.section variants={item} className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <button
          onClick={onTakeTest}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-left text-white shadow-xl shadow-violet-600/25 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-600/40"
        >
          <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_80%_at_20%_20%,black,transparent)]" />
          <div className="pointer-events-none absolute -bottom-14 -right-10 size-44 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="relative">
            <div className="grid size-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Timer className="size-6" />
            </div>
            <h3 className="mt-4 text-xl font-extrabold">Start a timed test</h3>
            <p className="mt-1 max-w-xs text-sm text-white/75">
              Pick a subject and topic — the clock starts ticking immediately.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-bold backdrop-blur transition-all group-hover:gap-2.5">
              Take test <ArrowRight className="size-4" />
            </span>
          </div>
        </button>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onOpenWeak("weak")}
              className="group rounded-3xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-lg"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                <Brain className="size-5" />
              </div>
              <h4 className="mt-3 text-sm font-extrabold">Weak practice</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">Missed once</p>
              <span className="mt-2 inline-block text-xs font-bold text-amber-500 opacity-0 transition-opacity group-hover:opacity-100">
                Start →
              </span>
            </button>
            <button
              onClick={() => onOpenWeak("hard")}
              className="group rounded-3xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-rose-400/60 hover:shadow-lg"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                <Flame className="size-5" />
              </div>
              <h4 className="mt-3 text-sm font-extrabold">Hard drill</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">Missed twice</p>
              <span className="mt-2 inline-block text-xs font-bold text-rose-500 opacity-0 transition-opacity group-hover:opacity-100">
                Start →
              </span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onGoWeak}
              className="group flex items-center gap-3 rounded-3xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-400/60 hover:shadow-lg"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500">
                <BookOpen className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold">Weak bank</h4>
                <p className="text-xs text-muted-foreground">Review misses</p>
              </div>
            </button>
            <button
              onClick={onGoAnalytics}
              className="group flex items-center gap-3 rounded-3xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-lg"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold">Analytics</h4>
                <p className="text-xs text-muted-foreground">Track progress</p>
              </div>
            </button>
          </div>
        </div>
      </motion.section>

      {/* Recent attempts */}
      <motion.section variants={item}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <Plus className="size-4 text-primary" /> Recent attempts
          </h2>
          <button
            onClick={onGoAnalytics}
            className="text-sm font-semibold text-primary transition-colors hover:text-primary/70"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Timer className="size-7" />
            </div>
            <h3 className="mt-4 font-extrabold">No tests yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your first mock test is one tap away.
            </p>
            <button
              onClick={onTakeTest}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
            >
              Take your first test <ArrowRight className="size-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recent.map((r, i) => {
              const meta = subjectMeta(r.category);
              const pctColor =
                r.pct >= 70
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : r.pct >= 40
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400";
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/30"
                >
                  <div className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${meta.gradient} text-lg shadow`}>
                    {meta.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {r.category}
                      {r.topic ? ` · ${r.topic}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.ts)} · {formatClock(r.timeSec)} · {r.mode}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black tabular-nums">
                      {r.correct}/{r.total} correct
                    </div>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${pctColor}`}>
                      {r.pct}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
