import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Flame, TrendingUp, Trophy } from "lucide-react";
import { subjectMeta } from "@/lib/test";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsViewProps {
  onBack: () => void;
}

export function AnalyticsView({ onBack }: AnalyticsViewProps) {
  const stats = useQuery(api.queries.userStats);
  const analytics = useQuery(api.queries.analytics);

  const xpIntoLevel = stats?.xpIntoLevel ?? 0;
  const xpToNext = 100 - xpIntoLevel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl"
    >
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Home
      </button>

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Performance
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          Analytics <span className="text-primary">📊</span>
        </h1>
      </div>

      {/* XP card */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-7 text-white shadow-xl shadow-indigo-600/25"
      >
        <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_90%_at_70%_10%,black,transparent)]" />
        <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-fuchsia-400/30 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-white/15 text-xl font-black backdrop-blur">
                {stats?.level ?? 1}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-100/80">
                  Current level
                </p>
                <p className="text-lg font-extrabold">
                  {stats?.xp ?? 0} XP total
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <Flame className="size-3.5 text-amber-300" />
                {stats?.streak ?? 0}-day streak
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <Trophy className="size-3.5 text-amber-300" />
                {stats?.totalTests ?? 0} tests
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <TrendingUp className="size-3.5 text-emerald-300" />
                {stats?.avgPct ?? 0}% avg accuracy
              </span>
            </div>
          </div>

          <div className="min-w-52 flex-1 sm:max-w-56">
            <div className="flex items-end justify-between text-sm">
              <span className="font-bold">Level {(stats?.level ?? 1) + 1}</span>
              <span className="font-mono text-indigo-100/90 tabular-nums">
                {xpToNext} XP to go
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all duration-700"
                style={{ width: `${xpIntoLevel}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-indigo-100/80">
              {xpIntoLevel}/100 XP in this level
            </p>
          </div>
        </div>
      </motion.section>

      {/* Category accuracy */}
      <div className="mt-10 mb-4 flex items-center gap-2">
        <Award className="size-4 text-primary" />
        <h2 className="text-lg font-extrabold tracking-tight">
          Category accuracy
        </h2>
      </div>

      {analytics === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
      ) : analytics.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">
            <TrendingUp className="size-7" />
          </div>
          <h3 className="mt-4 font-extrabold">No data yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish a few tests and your per-subject accuracy will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {analytics.map((a, i) => {
            const meta = subjectMeta(a.category);
            return (
              <motion.div
                key={a.category}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${meta.gradient} text-lg shadow`}>
                    {meta.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold">{a.category}</span>
                      <span className="font-mono text-sm font-black tabular-nums">
                        {a.accuracy}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${a.accuracy}%` }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 + i * 0.07 }}
                        className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {a.attempts} tests · {a.answered} questions · {a.correct} correct
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
