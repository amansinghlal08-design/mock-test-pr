import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import type { TestConfig, TestMode } from "@/lib/test";
import { Clock3, Play, SlidersHorizontal } from "lucide-react";

interface TestSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TestConfig | null;
  /** Number of questions available for the current selection (used to clamp the limit). */
  available?: number;
  onConfirm: (config: TestConfig, limit: number) => void;
}

export function TestSetupDialog({ open, onOpenChange, config, available, onConfirm }: TestSetupDialogProps) {
  const [limit, setLimit] = useState(20);
  const [mode, setMode] = useState<TestMode>("normal");

  useEffect(() => {
    if (!open || !config) return;
    setMode(config.mode);
    const max = Math.max(1, available ?? 20);
    if (config.chunk) {
      // Chunked tests always use the exact chunk size — no other options.
      setLimit(max);
      return;
    }
    setLimit(Math.min(Math.max(1, Math.round(limit || 20)), max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config, available]);

  if (!config) return null;

  const isDrill = config.mode === "weak" || config.mode === "hard";
  const isChunk = !!config.chunk;
  const max = Math.max(1, available ?? 50);
  const safeLimit = Math.min(Math.max(1, Math.round(limit || max)), max);
  const timerHint =
    mode === "weak" || mode === "hard"
      ? `${safeLimit} min`
      : `${Math.max(1, Math.ceil(safeLimit / 2))} min`;

  const headline =
    config.mode === "normal"
      ? isChunk
        ? `${config.topic ?? "Topic"} · Test ${config.chunk}`
        : `${config.topic ?? "Topic"} test`
      : config.mode === "all"
        ? `Full ${config.category ?? "category"} mock`
        : config.mode === "hard"
          ? "Hard drill"
          : "Weak practice";

  const desc =
    config.mode === "normal"
      ? isChunk
        ? `Test ${config.chunk} of the “${config.topic}” bank — exactly ${safeLimit} fixed questions.`
        : `Timed test from “${config.topic}” with instant answers & explanations.`
      : config.mode === "all"
        ? `Every question in ${config.category ?? "the category"}, shuffled. The full exam experience.`
        : config.mode === "hard"
          ? "Only questions you've missed at least twice. Get them right to clear them."
          : "Questions you've missed before. Retrain those weak spots now.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-1 grid size-11 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
            <SlidersHorizontal className="size-5" />
          </div>
          <DialogTitle className="text-xl">{headline}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isChunk ? (
            <div className="flex items-center gap-2 rounded-xl bg-indigo-500/10 px-3.5 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-300">
              <SlidersHorizontal className="size-4 shrink-0" />
              Test {config.chunk} · {safeLimit} fixed questions
            </div>
          ) : (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="test-count" className="text-sm font-semibold">
                  Number of questions
                </label>
                <span className="text-xs font-medium text-muted-foreground">
                  {max} available
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  id="test-count"
                  type="number"
                  min={1}
                  max={max}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  onBlur={() =>
                    setLimit(Math.min(Math.max(1, Math.round(limit || max)), max))
                  }
                  className="h-11 flex-1 text-center text-base font-bold tabular-nums"
                  aria-label="Number of questions"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-1.5 border-primary/40 px-4 text-primary hover:bg-primary/10"
                  onClick={() => setLimit(max)}
                  title={`Use all ${max} questions`}
                >
                  <Play className="size-4" /> Play ALL
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Type any number from 1 to {max} — or play the whole set at once.
              </p>
            </div>
          )}

          {isDrill && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("weak")}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors ${
                    mode === "weak"
                      ? "border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-input text-muted-foreground hover:border-amber-400/50"
                  }`}
                >
                  Weak practice
                </button>
                <button
                  type="button"
                  onClick={() => setMode("hard")}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors ${
                    mode === "hard"
                      ? "border-rose-400 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "border-input text-muted-foreground hover:border-rose-400/50"
                  }`}
                >
                  Hard drill
                </button>
              </div>
            </div>
          )}

          {!isDrill && !isChunk && (
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-xs font-semibold text-muted-foreground">
              <SlidersHorizontal className="size-4 shrink-0 text-primary" />
              Normal mode · all questions shuffled
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-xs font-semibold text-muted-foreground">
            <Clock3 className="size-4 shrink-0 text-primary" />
            ~{timerHint} on the clock · auto-submits when time runs out
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 gap-1.5"
            onClick={() => onConfirm({ ...config, mode }, safeLimit)}
          >
            <Play className="size-4" /> Start test
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
