import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, Layers, ListChecks, Sparkles } from "lucide-react";
import { subjectMeta } from "@/lib/test";
import { Skeleton } from "@/components/ui/skeleton";

interface TopicsViewProps {
  category: string;
  onBack: () => void;
  onStartTopic: (topic: string, count: number) => void;
  onStartAll: () => void;
}

export function TopicsView({ category, onBack, onStartTopic, onStartAll }: TopicsViewProps) {
  const topics = useQuery(api.queries.topics, { category });
  const meta = subjectMeta(category);
  const totalCount = topics?.reduce((sum, t) => sum + t.count, 0) ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl"
    >
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All subjects
      </button>

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${meta.gradient} text-2xl shadow-lg`}>
          {meta.emoji}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Step 2 · Pick a topic
          </p>
          <h1 className="text-3xl font-black tracking-tight">{category}</h1>
        </div>
      </div>

      {/* Full category test */}
      <button
        onClick={onStartAll}
        className="group relative mb-6 flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-left text-white shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-1 hover:shadow-2xl"
      >
        <div className="bg-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_100%_at_20%_50%,black,transparent)]" />
        <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
          <Layers className="size-6" />
        </div>
        <div className="relative flex-1">
          <h3 className="text-lg font-extrabold">Full {category} mock test</h3>
          <p className="text-sm text-white/75">
            {totalCount > 0
              ? `All ${totalCount} questions from every topic, shuffled.`
              : "Loading question counts…"}
          </p>
        </div>
        <span className="relative grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur transition-transform group-hover:translate-x-1">
          <ListChecks className="size-4" />
        </span>
      </button>

      {topics === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t, i) => (
            <motion.button
              key={t.topic}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              onClick={() => onStartTopic(t.topic, t.count)}
              className="group rounded-3xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-extrabold leading-snug">{t.topic}</h4>
                <Sparkles className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.count} questions · {Math.max(1, Math.ceil(t.count / 2))} min
              </p>
              <span className="mt-3 inline-block text-sm font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Start test →
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
