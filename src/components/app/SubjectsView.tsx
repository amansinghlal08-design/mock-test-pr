import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { subjectMeta } from "@/lib/test";
import { Skeleton } from "@/components/ui/skeleton";

interface SubjectsViewProps {
  onSelect: (category: string) => void;
}

export function SubjectsView({ onSelect }: SubjectsViewProps) {
  const categories = useQuery(api.queries.categories);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl"
    >
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Step 1 · Choose a subject
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          What do you want to master?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every subject breaks into focused topics. Pick one to see its mock
          tests.
        </p>
      </div>

      {categories === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-3xl" />
          ))}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {categories.map((c) => {
            const meta = subjectMeta(c.category);
            return (
              <motion.button
                key={c.category}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
                }}
                onClick={() => onSelect(c.category)}
                className="group relative overflow-hidden rounded-3xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl"
              >
                <div
                  className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-br ${meta.gradient} text-2xl shadow-lg`}
                >
                  {meta.emoji}
                </div>
                <h3 className="mt-5 text-xl font-extrabold">{c.category}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground/80">
                    <BookOpen className="size-4 text-muted-foreground" />
                    {c.count} questions
                  </span>
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground transition-all group-hover:bg-primary group-hover:text-white">
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
