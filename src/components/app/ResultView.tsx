import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Home,
  Lightbulb,
  RotateCcw,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { ActiveTest, TestSummary } from "@/lib/test";
import { formatClock, resultEmoji, resultMessage } from "@/lib/test";
import { ConfettiBurst } from "./Confetti";
import { ScoreRing } from "./ScoreRing";

interface ResultViewProps {
  test: ActiveTest;
  summary: TestSummary;
  timeUp: boolean;
  onRetake: () => void;
  onHome: () => void;
}

export function ResultView({ test, summary, timeUp, onRetake, onHome }: ResultViewProps) {
  const [showReview, setShowReview] = useState(false);
  const celebrate = summary.pct >= 70;

  return (
    <div className="mx-auto max-w-2xl">
      {celebrate && <ConfettiBurst />}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border bg-card p-8 text-center shadow-xl shadow-foreground/5"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
          className="text-6xl"
        >
          {resultEmoji(summary.pct)}
        </motion.div>
        <h2 className="mt-3 text-3xl font-black tracking-tight">Test complete!</h2>
        <p className="mt-1.5 text-muted-foreground">
          {resultMessage(summary.pct)}
          {timeUp && <span className="font-semibold text-rose-500"> · Time's up</span>}
        </p>

        <div className="mt-6">
          <ScoreRing pct={summary.pct} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Correct", value: summary.correct, cls: "text-emerald-500" },
            { label: "Wrong", value: summary.wrong, cls: "text-rose-500" },
            { label: "Skipped", value: summary.skipped, cls: "text-muted-foreground" },
            { label: "Time", value: formatClock(summary.timeSec), cls: "text-indigo-500" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="rounded-2xl border bg-muted/40 p-4"
            >
              <div className={`text-2xl font-black tabular-nums ${s.cls}`}>{s.value}</div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* XP banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-left text-white shadow-lg shadow-indigo-600/25"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Zap className="size-5 text-amber-300" />
            </span>
            <div>
              <div className="text-sm font-extrabold">+{summary.xpEarned} XP earned</div>
              <div className="text-xs text-white/75">
                Level {summary.newLevel} · {summary.newXp} XP total
              </div>
            </div>
          </div>
          <div className="text-right">
            {summary.isLevelUp ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-900">
                <ArrowUp className="size-3.5" /> LEVEL UP!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Sparkles className="size-3.5 text-amber-300" /> {summary.newStreak}-day streak
              </span>
            )}
          </div>
        </motion.div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => setShowReview((v) => !v)}
            variant="outline"
            className="gap-2"
          >
            <ChevronDown className={`size-4 transition-transform ${showReview ? "rotate-180" : ""}`} />
            Review answers
          </Button>
          <Button onClick={onRetake} className="gap-2">
            <RotateCcw className="size-4" /> Retake
          </Button>
          <Button onClick={onHome} variant="outline" className="gap-2">
            <Home className="size-4" /> Home
          </Button>
        </div>
      </motion.div>

      {/* Review */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-6">
              {test.questions.map((q, i) => {
                const ans = test.answers[i];
                const status = ans === null ? "skipped" : ans === q.correct ? "correct" : "wrong";
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-3xl border bg-card p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        Q{i + 1} · <span className="text-foreground">{q.category}</span>
                        {q.topic ? ` · ${q.topic}` : ""}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${
                          status === "correct"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : status === "wrong"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <h4 className="mt-2 font-extrabold leading-snug">{q.question}</h4>

                    <div className="mt-3 space-y-1.5">
                      {q.options.map((opt, j) => {
                        const isCorrect = j === q.correct;
                        const isChosen = ans === j;
                        let cls = "text-muted-foreground";
                        if (isCorrect) cls = "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-400";
                        else if (isChosen) cls = "border-rose-500/50 bg-rose-500/10 font-bold text-rose-700 line-through dark:text-rose-400";
                        return (
                          <div key={j} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${cls}`}>
                            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-black">
                              {isCorrect ? <Check className="size-3.5" /> : isChosen ? <X className="size-3.5" /> : String.fromCharCode(65 + j)}
                            </span>
                            {opt}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-3 flex gap-2.5 rounded-xl border-l-4 border-amber-400 bg-amber-500/8 p-3 text-sm">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <span className="leading-relaxed text-muted-foreground">
                          <b className="text-foreground">Explanation: </b>
                          {q.explanation}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
