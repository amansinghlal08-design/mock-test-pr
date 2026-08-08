import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Lightbulb,
  Play,
  X,
} from "lucide-react";
import { useState } from "react";
import { subjectMeta } from "@/lib/test";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface WeakViewProps {
  onPractice: () => void;
  onBack: () => void;
}

export function WeakView({ onPractice, onBack }: WeakViewProps) {
  const [page, setPage] = useState(1);
  const data = useQuery(api.queries.weakQuestions, { page });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Home
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Question bank · {data?.total ?? 0} total
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Weak questions <span className="text-amber-500">📚</span>
          </h1>
        </div>
        <Button onClick={onPractice} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600">
          <Play className="size-4" /> Practice weak
        </Button>
      </div>

      {data === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-3xl" />
          ))}
        </div>
      ) : data.weakQuestions.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Check className="size-8" />
          </div>
          <h3 className="mt-4 text-xl font-extrabold">Nothing weak here! 🎉</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Questions you miss will show up here automatically so you can turn
            them into strengths.
          </p>
          <Button onClick={onPractice} className="mt-6 gap-2">
            <Flame className="size-4" /> Take a test
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.weakQuestions.map((w, i) => {
              const meta = subjectMeta(w.category);
              return (
                <motion.div
                  key={w.weakId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-3xl border-l-4 border-l-amber-400 bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${meta.gradient} px-2.5 py-0.5 text-[11px] font-bold text-white`}>
                        {meta.emoji} {w.category}
                      </span>
                      {w.topic && (
                        <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground">
                          {w.topic}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-600 dark:text-amber-400">
                      <X className="size-3" /> {w.wrongCount}x missed
                    </span>
                  </div>

                  <h4 className="mt-3 font-extrabold leading-snug">{w.question}</h4>

                  <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {w.options.map((opt, j) => (
                      <div
                        key={j}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                          j === w.correct
                            ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-black">
                          {j === w.correct ? <Check className="size-3.5" /> : String.fromCharCode(65 + j)}
                        </span>
                        {opt}
                      </div>
                    ))}
                  </div>

                  {w.explanation && (
                    <div className="mt-3 flex gap-2.5 rounded-xl border-l-4 border-amber-400 bg-amber-500/8 p-3 text-sm">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <span className="leading-relaxed text-muted-foreground">
                        <b className="text-foreground">Explanation: </b>
                        {w.explanation}
                      </span>
                    </div>
                  )}

                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Last missed: {new Date(w.lastWrong).toLocaleString()}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ArrowLeft className="size-4" />
              </Button>
              {Array.from({ length: data.totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
