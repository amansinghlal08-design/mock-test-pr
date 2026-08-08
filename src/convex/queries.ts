import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

/** Distinct categories with question counts (derived from the bank). */
export const categories = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    const map = new Map<string, number>();
    for (const q of questions) {
      map.set(q.category, (map.get(q.category) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/** Topics within a category, with question counts. */
export const topics = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
    const map = new Map<string, number>();
    for (const q of questions) {
      map.set(q.topic, (map.get(q.topic) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/** Aggregate profile stats for the signed-in user. */
export const userStats = query({
  args: {},
  handler: async (ctx) => {
    const totalQuestions = (await ctx.db.query("questions").collect()).length;

    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        totalQuestions,
        totalTests: 0,
        avgPct: 0,
        weakCount: 0,
        xp: 0,
        level: 1,
        streak: 0,
        xpIntoLevel: 0,
      };
    }
    const user = await ctx.db.get(userId);
    if (user?.banned) {
      return {
        totalQuestions,
        totalTests: 0,
        avgPct: 0,
        weakCount: 0,
        xp: 0,
        level: 1,
        streak: 0,
        xpIntoLevel: 0,
      };
    }

    const attempts = await ctx.db
      .query("testAttempts")
      .withIndex("by_user_ts", (q) => q.eq("userId", userId))
      .collect();
    const totalTests = attempts.length;
    const avgPct = totalTests
      ? Math.round((attempts.reduce((sum, a) => sum + a.pct, 0) / totalTests) * 10) / 10
      : 0;

    const weaks = await ctx.db
      .query("weakQuestions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      totalQuestions,
      totalTests,
      avgPct,
      weakCount: weaks.length,
      xp: stats?.xp ?? 0,
      level: stats?.level ?? 1,
      streak: stats?.streak ?? 0,
      xpIntoLevel: (stats?.xp ?? 0) % 100,
    };
  },
});

/** Most recent test attempts (newest first). */
export const recentAttempts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const user = await ctx.db.get(userId);
    if (user?.banned) return [];
    const attempts = await ctx.db
      .query("testAttempts")
      .withIndex("by_user_ts", (q) => q.eq("userId", userId))
      .collect();
    return attempts
      .sort((a, b) => b.ts - a.ts)
      .slice(0, args.limit ?? 20)
      .map((a) => ({
        id: a._id,
        category: a.category,
        topic: a.topic,
        total: a.total,
        correct: a.correct,
        wrong: a.wrong,
        skipped: a.skipped,
        pct: a.pct,
        timeSec: a.timeSec,
        mode: a.mode,
        ts: a.ts,
      }));
  },
});

/** Per-category accuracy, rolled up across all of the user's attempts. */
export const analytics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const user = await ctx.db.get(userId);
    if (user?.banned) return [];
    const attempts = await ctx.db
      .query("testAttempts")
      .withIndex("by_user_ts", (q) => q.eq("userId", userId))
      .collect();

    const per = new Map<string, { total: number; correct: number; tests: number }>();
    for (const a of attempts) {
      const entry = per.get(a.category) ?? { total: 0, correct: 0, tests: 0 };
      entry.total += a.total;
      entry.correct += a.correct;
      entry.tests += 1;
      per.set(a.category, entry);
    }

    return [...per.entries()]
      .map(([category, e]) => ({
        category,
        accuracy: e.total ? Math.round((e.correct / e.total) * 1000) / 10 : 0,
        attempts: e.tests,
        answered: e.total,
        correct: e.correct,
      }))
      .sort((a, b) => b.attempts - a.attempts);
  },
});

/**
 * Global leaderboard — every registered user ranked by XP, joined with their
 * lifetime accuracy and test count. The signed-in user's own id is included so
 * the client can highlight their row.
 */
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    const stats = await ctx.db.query("userStats").collect();
    const rows: {
      userId: string;
      name: string;
      level: number;
      xp: number;
      streak: number;
      tests: number;
      accuracy: number;
    }[] = [];

    for (const s of stats) {
      const u = await ctx.db.get(s.userId);
      if (!u || u.isAnonymous || u.banned) continue;
      const attempts = await ctx.db
        .query("testAttempts")
        .withIndex("by_user_ts", (q) => q.eq("userId", s.userId))
        .collect();
      const total = attempts.reduce((sum, a) => sum + a.total, 0);
      const correct = attempts.reduce((sum, a) => sum + a.correct, 0);
      rows.push({
        userId: s.userId,
        name: u.name || (u.email ? u.email.split("@")[0] : "Guest"),
        level: s.level,
        xp: s.xp,
        streak: s.streak,
        tests: attempts.length,
        accuracy: total ? Math.round((correct / total) * 1000) / 10 : 0,
      });
    }

    rows.sort(
      (a, b) => b.xp - a.xp || b.level - a.level || b.accuracy - a.accuracy,
    );

    return {
      rows: rows.slice(0, 50).map((r, i) => ({ ...r, rank: i + 1 })),
      myUserId: userId,
      totalPlayers: rows.length,
    };
  },
});

/** Paginated list of the user's weak questions, worst first. */
export const weakQuestions = query({
  args: { page: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { weakQuestions: [], page: 1, totalPages: 0, total: 0 };
    }
    const user = await ctx.db.get(userId);
    if (user?.banned) {
      return { weakQuestions: [], page: 1, totalPages: 0, total: 0 };
    }
    const page = Math.max(1, args.page ?? 1);
    const pageSize = 20;

    const weaks = await ctx.db
      .query("weakQuestions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    weaks.sort((a, b) => b.wrongCount - a.wrongCount || b.lastWrong - a.lastWrong);

    const total = weaks.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const slice = weaks.slice((page - 1) * pageSize, page * pageSize);

    const result = [];
    for (const w of slice) {
      const q = await ctx.db.get(w.questionId);
      if (!q) continue;
      result.push({
        weakId: w._id,
        questionId: q._id,
        category: q.category,
        topic: q.topic,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        wrongCount: w.wrongCount,
        lastWrong: w.lastWrong,
      });
    }

    return { weakQuestions: result, page, totalPages, total };
  },
});
