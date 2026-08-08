import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { TestConfig, TestMode } from "@/lib/test";
import { Clock3, SlidersHorizontal } from "lucide-react";

interface TestSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TestConfig | null;
  /** Number of questions available for the current selection (used to clamp the limit). */
  available?: number;
  onConfirm: (config: TestConfig, limit: number) => void;
}

const LIMITS = [10, 20, 30, 50];

export function TestSetupDialog({ open, onOpenChange, config, available, onConfirm }: TestSetupDialogProps) {
  const [limit, setLimit] = useState(20);
  const [mode, setMode] = useState<TestMode>("normal");

  useEffect(() => {
    if (!open || !config) return;
    setMode(config.mode);
    const max = Math.max(1, available ?? 20);
    const clamped = Math.min(max, 20);
    setLimit(
      LIMITS.includes(clamped)
        ? clamped
        : LIMITS.reduce((best, l) =>
            Math.abs(l - clamped) < Math.abs(best - clamped) ? l : best,
          LIMITS[0]),
    );
  }, [open, config, available]);

  if (!config) return null;

  const isDrill = config.mode === "weak" || config.mode === "hard";
  const max = Math.max(1, available ?? 50);
  const options =
    max < LIMITS[0]
      ? [{ value: max, label: `All ${max} questions` }]
      : LIMITS.filter((l) => l <= max).map((l) => ({ value: l, label: `${l} questions` }));
  const shown = options.some((o) => o.value === limit) ? limit : options[options.length - 1].value;
  const safeLimit = Math.min(limit, max);
  const timerHint =
    mode === "weak" || mode === "hard"
      ? `${safeLimit} min`
      : `${Math.max(1, Math.ceil(safeLimit / 2))} min`;

  const headline =
    config.mode === "normal"
      ? `${config.topic ?? "Topic"} test`
      : config.mode === "all"
        ? `Full ${config.category ?? "category"} mock`
        : config.mode === "hard"
          ? "Hard drill"
          : "Weak practice";

  const desc =
    config.mode === "normal"
      ? `Timed test from “${config.topic}” with instant answers & explanations.`
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
          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Number of questions
            </label>
            <select
              value={shown}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium outline-none transition-[border,box-shadow] focus:border-primary focus:ring-3 focus:ring-primary/20"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Mode</label>
            <select
              value={mode}
              disabled={!isDrill}
              onChange={(e) => setMode(e.target.value as TestMode)}
              className="h-11 w-full rounded-xl border bg-background px-3 text-sm font-medium outline-none transition-[border,box-shadow] focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:opacity-50"
            >
              {isDrill ? (
                <>
                  <option value="weak">Weak Practice · missed once</option>
                  <option value="hard">Hard Drill · missed twice</option>
                </>
              ) : (
                <option value="normal">Normal · all questions</option>
              )}
            </select>
          </div>

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
            className="flex-1"
            onClick={() => onConfirm({ ...config, mode }, safeLimit)}
          >
            Start test
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
