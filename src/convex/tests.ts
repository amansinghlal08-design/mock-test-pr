import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { SEED_QUESTIONS } from "./seedData";

export const TEST_MODES = ["normal", "all", "weak", "hard"] as const;
export type TestMode = (typeof TEST_MODES)[number];

export const testModeValidator = v.union(
  v.literal("normal"),
  v.literal("all"),
  v.literal("weak"),
  v.literal("hard"),
);

const questionPayloadValidator = v.object({
  id: v.id("questions"),
  category: v.string(),
  topic: v.string(),
  question: v.string(),
  options: v.array(v.string()),
  correct: v.number(),
  explanation: v.string(),
});

/** Fisher–Yates shuffle (in place). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Randomise option order and recompute the correct-answer index. */
function shuffleOptions(q: Doc<"questions">) {
  const indices = shuffle(q.options.map((_, i) => i));
  return {
    id: q._id,
    category: q.category,
    topic: q.topic,
    question: q.question,
    options: indices.map((i) => q.options[i]),
    correct: indices.indexOf(q.correct),
    explanation: q.explanation,
  };
}

const DAY = 86_400_000;

/**
 * Seed the starter question bank if the table is empty. Idempotent — safe to
 * call on every dashboard mount.
 */
export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("questions").first();
    if (existing) return { seeded: false, count: 0 };
    for (const item of SEED_QUESTIONS) {
      await ctx.db.insert("questions", item);
    }
    return { seeded: true, count: SEED_QUESTIONS.length };
  },
});

/**
 * Build a timed test for the signed-in user.
 *  - normal: one topic, requires at least `limit` questions
 *  - all:    whole category (up to `limit`)
 *  - weak:   questions missed at least once
 *  - hard:   questions missed at least twice
 * Question options are shuffled server-side; the client receives everything
 * it needs for instant feedback + explanations.
 */
export const startTest = mutation({
  args: {
    category: v.optional(v.string()),
    topic: v.optional(v.string()),
    mode: testModeValidator,
    limit: v.number(),
  },
  returns: v.union(
    v.object({ ok: v.literal(false), error: v.string() }),
    v.object({
      ok: v.literal(true),
      questions: v.array(questionPayloadValidator),
      timerSec: v.number(),
      mode: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { ok: false as const, error: "Please sign in to take a test." };
    }

    let picked: Doc<"questions">[] = [];

    if (args.mode === "normal") {
      if (!args.topic) {
        return { ok: false as const, error: "Pick a topic first." };
      }
      picked = await ctx.db
        .query("questions")
        .withIndex("by_category_topic", (qq) =>
          qq.eq("category", args.category ?? "").eq("topic", args.topic!),
        )
        .collect();
      if (picked.length < args.limit) {
        return {
          ok: false as const,
          error: `Only ${picked.length} questions here — pick a smaller test or another topic.`,
        };
      }
    } else if (args.mode === "all") {
      picked = await ctx.db
        .query("questions")
        .withIndex("by_category", (qq) => qq.eq("category", args.category ?? ""))
        .collect();
    } else {
      const weaks = await ctx.db
        .query("weakQuestions")
        .withIndex("by_user", (qq) => qq.eq("userId", userId))
        .collect();
      const relevant = weaks.filter((w) =>
        args.mode === "hard" ? w.wrongCount >= 2 : w.wrongCount >= 1,
      );
      if (relevant.length === 0) {
        return {
          ok: false as const,
          error:
            args.mode === "hard"
              ? "Nothing to drill yet — no questions missed twice."
              : "No weak questions yet — take a test first!",
        };
      }
      const ids = new Set(relevant.map((w) => w.questionId));
      const fetched: Doc<"questions">[] = [];
      for (const id of ids) {
        const qq = await ctx.db.get(id);
        if (qq) fetched.push(qq);
      }
      picked = fetched;
    }

    picked = shuffle(picked).slice(0, args.limit);
    if (picked.length === 0) {
      return { ok: false as const, error: "No questions found." };
    }

    const questions = picked.map(shuffleOptions);
    const perQ =
      args.mode === "weak" || args.mode === "hard"
        ? 60 // 1 min per question for drill modes
        : 30; // 30s per question otherwise
    const timerSec = Math.max(60, picked.length * perQ);

    return { ok: true as const, questions, timerSec, mode: args.mode };
  },
});

/**
 * Score a finished test: count correct/wrong/skipped, update the weak-question
 * bank, bump XP/level/streak, and store the attempt.
 */
export const submitTest = mutation({
  args: {
    answers: v.array(
      v.object({
        questionId: v.id("questions"),
        selected: v.union(v.number(), v.null()),
      }),
    ),
    category: v.optional(v.string()),
    topic: v.optional(v.string()),
    mode: v.string(),
    timeSec: v.number(),
  },
  returns: v.object({
    correct: v.number(),
    wrong: v.number(),
    skipped: v.number(),
    total: v.number(),
    pct: v.number(),
    timeSec: v.number(),
    xpEarned: v.number(),
    newXp: v.number(),
    newLevel: v.number(),
    newStreak: v.number(),
    isLevelUp: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Please sign in.");

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    for (const a of args.answers) {
      const q = await ctx.db.get(a.questionId);
      if (!q) continue;
      if (a.selected === null) {
        skipped++;
        continue;
      }
      const weak = await ctx.db
        .query("weakQuestions")
        .withIndex("by_user_question", (qq) =>
          qq.eq("userId", userId).eq("questionId", q._id),
        )
        .first();

      if (a.selected === q.correct) {
        correct++;
        // Hard-drill success on a repeat offender clears it back to one miss.
        if (args.mode === "hard" && weak && weak.wrongCount >= 2) {
          await ctx.db.patch(weak._id, { wrongCount: 1 });
        }
      } else {
        wrong++;
        if (!weak) {
          await ctx.db.insert("weakQuestions", {
            userId,
            questionId: q._id,
            wrongCount: 1,
            lastWrong: Date.now(),
          });
        } else {
          await ctx.db.patch(weak._id, {
            wrongCount: weak.wrongCount + 1,
            lastWrong: Date.now(),
          });
        }
      }
    }

    const total = args.answers.length;
    const pct = total ? Math.round((correct / total) * 10000) / 100 : 0;

    // XP / level / streak
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (qq) => qq.eq("userId", userId))
      .first();
    const prevLevel = stats?.level ?? 1;
    const today = Math.floor(Date.now() / DAY);

    let xp: number;
    let streak: number;
    let lastActive: number;
    if (stats && stats.lastActive === today) {
      xp = stats.xp + correct * 10;
      streak = stats.streak;
      lastActive = today;
    } else if (stats && stats.lastActive === today - 1) {
      xp = stats.xp + correct * 10;
      streak = stats.streak + 1;
      lastActive = today;
    } else {
      xp = (stats?.xp ?? 0) + correct * 10;
      streak = 1;
      lastActive = today;
    }
    const level = Math.min(99, Math.floor(xp / 100) + 1);

    if (stats) {
      await ctx.db.patch(stats._id, { xp, streak, lastActive, level });
    } else {
      await ctx.db.insert("userStats", { userId, xp, streak, lastActive, level });
    }

    await ctx.db.insert("testAttempts", {
      userId,
      category: args.category ?? "Mixed",
      topic: args.topic ?? "",
      total,
      correct,
      wrong,
      skipped,
      pct,
      timeSec: args.timeSec,
      mode: args.mode,
      ts: Date.now(),
    });

    return {
      correct,
      wrong,
      skipped,
      total,
      pct,
      timeSec: args.timeSec,
      xpEarned: correct * 10,
      newXp: xp,
      newLevel: level,
      newStreak: streak,
      isLevelUp: level > prevLevel,
    };
  },
});

/** Delete a user's weak-question history (useful for reset/demo). */
export const clearWeakQuestions = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const weaks = await ctx.db
      .query("weakQuestions")
      .withIndex("by_user", (qq) => qq.eq("userId", userId))
      .collect();
    for (const w of weaks) {
      await ctx.db.delete(w._id);
    }
  },
});

export type QuestionId = Id<"questions">;
