import { motion } from "framer-motion";
import { ArrowLeft, Clock3, FileText, Layers, ListChecks, Play } from "lucide-react";
import { CHUNK_SIZE, subjectMeta } from "@/lib/test";

interface ChunksViewProps {
  category: string;
  topic: string;
  count: number;
  onBack: () => void;
  onStartChunk: (chunkIndex: number, size: number) => void;
  onStartFull: () => void;
}

export function ChunksView({
  category,
  topic,
  count,
  onBack,
  onStartChunk,
  onStartFull,
}: ChunksViewProps) {
  const meta = subjectMeta(category);
  const numChunks = Math.max(1, Math.ceil(count / CHUNK_SIZE));
  const chunks = Array.from({ length: numChunks }, (_, i) => {
    const start = i * CHUNK_SIZE + 1;
    const end = Math.min(count, start + CHUNK_SIZE - 1);
    return { index: i + 1, start, end, size: end - start + 1 };
  });

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
        <ArrowLeft className="size-4" /> {category} · topics
      </button>

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div
          className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${meta.gradient} text-2xl shadow-lg`}
        >
          {meta.emoji}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Step 3 · Pick a test
          </p>
          <h1 className="text-3xl font-black tracking-tight">{topic}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count} questions · auto-split into {numChunks}{" "}
            {numChunks === 1 ? "test" : "tests"} of {CHUNK_SIZE}
          </p>
        </div>
      </div>

      {/* Full topic test */}
      <button
        onClick={onStartFull}
        className="group relative mb-6 flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-left text-white shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-1 hover:shadow-2xl"
      >
        <div className="bg-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_100%_at_20%_50%,black,transparent)]" />
        <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
          <Layers className="size-6" />
        </div>
        <div className="relative flex-1">
          <h3 className="text-lg font-extrabold">Full {topic} test</h3>
          <p className="text-sm text-white/75">
            All {count} questions from this topic in one sitting, shuffled.
          </p>
        </div>
        <span className="relative grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur transition-transform group-hover:translate-x-1">
          <ListChecks className="size-4" />
        </span>
      </button>

      <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <FileText className="size-3.5" /> Chunked tests
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chunks.map((c, i) => (
          <motion.button
            key={c.index}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            onClick={() => onStartChunk(c.index, c.size)}
            className="group relative overflow-hidden rounded-3xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-indigo-500/10 font-black text-indigo-600 dark:text-indigo-300 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {c.index}
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Play className="size-3" /> Test {c.index}
              </span>
            </div>
            <h4 className="mt-4 font-extrabold">
              Questions {c.start}–{c.end}
            </h4>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock3 className="size-3.5" />
              {c.size} questions · {Math.max(1, Math.ceil(c.size / 2))} min
            </p>
            <span className="mt-3 inline-block text-sm font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Start test →
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
