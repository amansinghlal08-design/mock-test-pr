import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";

/** The single super-admin account (hardcoded, case-insensitive). */
export const ADMIN_EMAIL = "amansinghlal08@gmail.com";

/** Throw unless the caller is the hardcoded super-admin. */
export async function requireAdmin(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Please sign in.");
  const user = await ctx.db.get(userId);
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Admin access required.");
  }
  return user;
}

/** True when the signed-in user is the super-admin. */
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const user = await ctx.db.get(userId);
    return !!user && user.email?.toLowerCase() === ADMIN_EMAIL;
  },
});

/** Public check used by the auth screen for smart routing (email → register). */
export const emailExists = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = (args.email ?? "").trim().toLowerCase();
    if (!email) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    return user !== null;
  },
});

/** Platform-wide counters for the admin overview screen. */
export const adminOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const questions = await ctx.db.query("questions").collect();
    const attempts = await ctx.db.query("testAttempts").collect();
    const weak = await ctx.db.query("weakQuestions").collect();
    const banned = users.filter((u) => u.banned).length;
    const categories = new Set(questions.map((q) => q.category));
    const topics = new Set(questions.map((q) => `${q.category}\u0000${q.topic}`));
    return {
      users: users.length,
      banned,
      questions: questions.length,
      attempts: attempts.length,
      weak: weak.length,
      categories: categories.size,
      topics: topics.size,
    };
  },
});

/** Every registered (non-guest) user with their stats, for the admin panel. */
export const adminUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const stats = await ctx.db.query("userStats").collect();
    const attempts = await ctx.db.query("testAttempts").collect();

    const statMap = new Map(stats.map((s) => [s.userId, s]));
    const attemptCount = new Map<string, number>();
    for (const a of attempts) {
      attemptCount.set(a.userId, (attemptCount.get(a.userId) ?? 0) + 1);
    }

    return users
      .filter((u) => !u.isAnonymous)
      .map((u) => {
        const s = statMap.get(u._id);
        return {
          userId: u._id,
          name: u.name ?? "—",
          email: u.email ?? "",
          banned: !!u.banned,
          xp: s?.xp ?? 0,
          level: s?.level ?? 1,
          streak: s?.streak ?? 0,
          tests: attemptCount.get(u._id) ?? 0,
          isAdmin: (u.email ?? "").toLowerCase() === ADMIN_EMAIL,
        };
      })
      .sort((a, b) => b.xp - a.xp);
  },
});

/** Temporarily ban / unban a user. The super-admin can never be banned. */
export const setBanned = mutation({
  args: { userId: v.id("users"), banned: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    if ((target.email ?? "").toLowerCase() === ADMIN_EMAIL) {
      throw new Error("Cannot ban the super-admin.");
    }
    await ctx.db.patch(args.userId, { banned: args.banned });
    return { ok: true, banned: args.banned };
  },
});

/** Add a single question (creates the category/topic on the fly). */
export const addQuestion = mutation({
  args: {
    category: v.string(),
    topic: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    correct: v.number(),
    explanation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const options = args.options.filter((o) => o.trim());
    if (options.length < 2) throw new Error("At least 2 options are required.");
    if (!args.category.trim() || !args.topic.trim() || !args.question.trim()) {
      throw new Error("Category, topic and question text are required.");
    }
    const id = await ctx.db.insert("questions", {
      category: args.category.trim(),
      topic: args.topic.trim(),
      question: args.question.trim(),
      options: options.slice(0, 4),
      correct: Math.min(Math.max(0, Math.round(args.correct)), options.length - 1),
      explanation: args.explanation?.trim() ?? "",
    });
    return { ok: true, id };
  },
});

/** Delete one question and its weak-question references. */
export const deleteQuestion = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const weaks = await ctx.db.query("weakQuestions").collect();
    for (const w of weaks) {
      if (w.questionId === args.questionId) await ctx.db.delete(w._id);
    }
    await ctx.db.delete(args.questionId);
    return { ok: true };
  },
});

/** Delete every question in a topic, plus weak references. */
export const deleteTopic = mutation({
  args: { category: v.string(), topic: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_category_topic", (q) =>
        q.eq("category", args.category).eq("topic", args.topic),
      )
      .collect();
    const ids = new Set(questions.map((q) => q._id));
    const weaks = await ctx.db.query("weakQuestions").collect();
    for (const w of weaks) {
      if (ids.has(w.questionId)) await ctx.db.delete(w._id);
    }
    for (const q of questions) await ctx.db.delete(q._id);
    return { ok: true, deleted: questions.length };
  },
});

/** Delete an entire category (all topics), plus weak references. */
export const deleteCategory = mutation({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
    const ids = new Set(questions.map((q) => q._id));
    const weaks = await ctx.db.query("weakQuestions").collect();
    for (const w of weaks) {
      if (ids.has(w.questionId)) await ctx.db.delete(w._id);
    }
    for (const q of questions) await ctx.db.delete(q._id);
    return { ok: true, deleted: questions.length };
  },
});

/** All questions (optionally filtered by category) for the admin editor. */
export const adminQuestions = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const category = args.category;
    const questions = category
      ? await ctx.db
          .query("questions")
          .withIndex("by_category", (q) => q.eq("category", category))
          .collect()
      : await ctx.db.query("questions").collect();
    return questions.map((q) => ({
      id: q._id,
      category: q.category,
      topic: q.topic,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation,
    }));
  },
});
