import type { Id } from "@/convex/_generated/dataModel";

/** A question as delivered to the client for a live test. */
export interface TestQuestion {
  id: Id<"questions">;
  category: string;
  topic: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

/** A test currently in progress. */
export interface ActiveTest {
  questions: TestQuestion[];
  answers: (number | null)[];
  currentIdx: number;
  startAt: number;
  timerSec: number;
  mode: string;
  category: string;
  topic: string;
  /** 1-based auto-chunk index, when this test is one chunk of a topic. */
  chunk?: number;
}

/** Result payload from submitTest. */
export interface TestSummary {
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  pct: number;
  timeSec: number;
  xpEarned: number;
  newXp: number;
  newLevel: number;
  newStreak: number;
  isLevelUp: boolean;
}

export type View =
  | "home"
  | "subjects"
  | "topics"
  | "chunks"
  | "test"
  | "result"
  | "weak"
  | "analytics"
  | "leaderboard"
  | "admin";

export type TestMode = "normal" | "all" | "weak" | "hard";

export interface TestConfig {
  mode: TestMode;
  category?: string;
  topic?: string;
  /** 1-based auto-chunk index for chunked topic tests (Test 1, Test 2, …). */
  chunk?: number;
}

/** Questions per auto-generated chunk (must match the backend constant). */
export const CHUNK_SIZE = 20;

export const MODE_LABELS: Record<TestMode, string> = {
  normal: "Topic test",
  all: "Full category",
  weak: "Weak practice",
  hard: "Hard drill",
};

/** mm:ss */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name?: string | null): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const SUBJECT_META: Record<
  string,
  { emoji: string; gradient: string; blurb: string }
> = {
  GK: {
    emoji: "🌍",
    gradient: "from-indigo-500 to-violet-500",
    blurb: "Geography & history",
  },
  Maths: {
    emoji: "🔢",
    gradient: "from-amber-500 to-orange-500",
    blurb: "Arithmetic & geometry",
  },
  English: {
    emoji: "🇬🇧",
    gradient: "from-sky-500 to-blue-600",
    blurb: "Grammar & nouns",
  },
  Reasoning: {
    emoji: "🧩",
    gradient: "from-emerald-500 to-teal-500",
    blurb: "Series & patterns",
  },
  Science: {
    emoji: "🔬",
    gradient: "from-rose-500 to-pink-600",
    blurb: "Physics fundamentals",
  },
};

export function subjectMeta(category: string) {
  return (
    SUBJECT_META[category] ?? {
      emoji: "📘",
      gradient: "from-slate-500 to-slate-600",
      blurb: "Practice questions",
    }
  );
}

export function resultEmoji(pct: number): string {
  if (pct >= 90) return "🏆";
  if (pct >= 70) return "🎉";
  if (pct >= 50) return "👍";
  return "📚";
}

export function resultMessage(pct: number): string {
  if (pct >= 90) return "Outstanding — you crushed it!";
  if (pct >= 70) return "Great job — keep the momentum!";
  if (pct >= 50) return "Solid effort — a little more practice!";
  return "Don't give up — review and try again!";
}
