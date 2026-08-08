import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Check, Flag, Lightbulb, LogOut, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ActiveTest } from "@/lib/test";
import { formatClock, subjectMeta } from "@/lib/test";

interface TestViewProps {
  test: ActiveTest;
  onAnswer: (idx: number, selected: number) => void;
  onJump: (idx: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
  onQuit: () => void;
  onTimeUp: () => void;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}

export function TestView({
  test,
  onAnswer,
  onJump,
  onPrev,
  onNext,
  onFinish,
  onQuit,
  onTimeUp,
}: TestViewProps) {
  const [now, setNow] = useState(() => Date.now());
  const [quitOpen, setQuitOpen] = useState(false);
  const timeUpFired = useRef(false);

  const elapsed = Math.floor((now - test.startAt) / 1000);
  const remaining = Math.max(0, test.timerSec - elapsed);
  const warning = remaining <= 30 && remaining > 0;

  const q = test.questions[test.currentIdx];
  const answered = test.answers[test.currentIdx];
  const isLast = test.currentIdx === test.questions.length - 1;
  const meta = subjectMeta(q.category);

  // Countdown ticker
  useEffect(() => {
    timeUpFired.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [test.startAt, test.timerSec]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (remaining <= 0 && !timeUpFired.current) {
      timeUpFired.current = true;
      onTimeUp();
    }
  }, [remaining, onTimeUp]);

  // Keyboard shortcuts
  useEffect(() => {
    if (quitOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "4") {
        const idx = Number(e.key) - 1;
        if (idx < q.options.length && test.answers[test.currentIdx] === null) {
          e.preventDefault();
          onAnswer(test.currentIdx, idx);
        }
      } else if (e.key === "Enter" || e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (isLast) onFinish();
        else onNext();
      } else if (e.key === "Backspace" || e.key.toLowerCase() === "p" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (test.currentIdx > 0) onPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [test, q, isLast, quitOpen, onAnswer, onNext, onPrev, onFinish]);

  const handleSelect = (optionIdx: number) => {
    if (test.answers[test.currentIdx] !== null) return;
    onAnswer(test.currentIdx, optionIdx);
    if (optionIdx === q.correct) vibrate(40);
    else vibrate([60, 40, 60]);
  };

  const answeredCount = test.answers.filter((a) => a !== null).length;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Top bar */}
      <div className="mb-5 flex items-center gap-4">
        <button
          onClick={() => setQuitOpen(true)}
          className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card text-muted-foreground shadow-sm transition-all hover:border-rose-400/60 hover:text-rose-500"
          title="Quit test"
        >
          <X className="size-4" />
        </button>
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">
              Question <span className="text-foreground">{test.currentIdx + 1}</span> of{" "}
              {test.questions.length}
            </span>
            <span className="text-muted-foreground">
              {answeredCount}/{test.questions.length} answered
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
              style={{
                width: `${((test.currentIdx + 1) / test.questions.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 font-mono text-sm font-bold tabular-nums shadow-sm ${
            warning
              ? "animate-pulse border-rose-400/60 bg-rose-500/10 text-rose-500"
              : "border bg-card"
          }`}
        >
          <span className={remaining <= 60 ? "" : "text-muted-foreground"}>⏱</span>
          {formatClock(remaining)}
        </div>
      </div>

      {/* Question palette */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {test.questions.map((_, i) => {
          const state = test.answers[i];
          const isCurrent = i === test.currentIdx;
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              className={`grid size-7 place-items-center rounded-lg text-[11px] font-bold transition-all ${
                isCurrent
                  ? "bg-primary text-primary-foreground shadow-md"
                  : state !== null
                    ? "bg-emerald-500/90 text-white"
                    : "border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Question card — static, zero animation during the active test */}
      <div
        key={q.id}
        className="rounded-3xl border bg-card p-6 shadow-lg shadow-foreground/5 sm:p-8"
      >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${meta.gradient} px-3 py-1 text-xs font-bold text-white`}>
              {meta.emoji} {q.category}
            </span>
            {q.topic && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {q.topic}
              </span>
            )}
          </div>

          <h2 className="mt-5 text-xl font-extrabold leading-snug sm:text-2xl">
            {q.question}
          </h2>

          <div className="mt-6 space-y-2.5">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correct;
              const isChosen = answered === i;
              const revealed = answered !== null;
              // Instant, static selection — only color/border swap, no motion.
              let cls = "border-input bg-background";
              if (!revealed) cls = "border-input bg-background hover:border-primary";
              else if (isCorrect) cls = "border-emerald-500/60 bg-emerald-500/10";
              else if (isChosen) cls = "border-rose-500/60 bg-rose-500/10";
              else cls = "border-input bg-background opacity-50";
              return (
                <button
                  key={i}
                  disabled={revealed}
                  onClick={() => handleSelect(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-semibold ${cls} disabled:cursor-default`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-extrabold transition-colors ${
                      revealed && isCorrect
                        ? "bg-emerald-500 text-white"
                        : revealed && isChosen
                          ? "bg-rose-500 text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {revealed && isCorrect ? (
                      <Check className="size-4" />
                    ) : revealed && isChosen ? (
                      <X className="size-4" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {revealed && isCorrect && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Correct
                    </span>
                  )}
                  {revealed && isChosen && !isCorrect && (
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      Wrong
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {answered !== null && q.explanation && (
            <div className="mt-5 flex gap-3 rounded-2xl border-l-4 border-amber-400 bg-amber-500/8 p-4">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div className="text-sm leading-relaxed">
                <span className="font-extrabold">Explanation: </span>
                {q.explanation}
              </div>
            </div>
          )}
        </div>

      {/* Nav buttons */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={test.currentIdx === 0}
          className="gap-1.5"
        >
          <span aria-hidden>←</span> Previous
        </Button>
        {isLast ? (
          <Button
            onClick={onFinish}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 px-6 shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
          >
            <Flag className="size-4" /> Finish test
          </Button>
        ) : (
          <Button onClick={onNext} className="gap-2 px-6">
            Next <span aria-hidden>→</span>
          </Button>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">1–4</kbd> answer ·{" "}
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> next ·{" "}
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">←</kbd> back
      </p>

      {/* Quit confirmation */}
      <AlertDialog open={quitOpen} onOpenChange={setQuitOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Quit this test?</AlertDialogTitle>
            <AlertDialogDescription>
              Progress on this test won't be saved. Your XP and weak-question
              tracking are only updated when you finish.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setQuitOpen(false);
                onQuit();
              }}
              className="gap-2 bg-rose-500 hover:bg-rose-600"
            >
              <LogOut className="size-4" /> Quit test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
