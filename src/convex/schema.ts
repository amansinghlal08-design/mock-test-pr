import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // Admin-managed restriction flag. When true, the user is temporarily
      // banned from taking tests and their stats read as zero.
      banned: v.optional(v.boolean()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Question bank — each question belongs to a category (GK, Maths, ...)
    // and a topic (World Geography, Arithmetic, ...). `options` holds the
    // four choices and `correct` the index of the right answer (0-3).
    questions: defineTable({
      category: v.string(),
      topic: v.string(),
      question: v.string(),
      options: v.array(v.string()),
      correct: v.number(),
      explanation: v.string(),
    })
      .index("by_category", ["category"])
      .index("by_category_topic", ["category", "topic"]),

    // One row per completed test.
    testAttempts: defineTable({
      userId: v.id("users"),
      category: v.string(),
      topic: v.string(),
      total: v.number(),
      correct: v.number(),
      wrong: v.number(),
      skipped: v.number(),
      pct: v.number(),
      timeSec: v.number(),
      mode: v.string(),
      ts: v.number(),
    }).index("by_user_ts", ["userId", "ts"]),

    // Questions a user got wrong — powers Weak Practice / Hard Drill.
    weakQuestions: defineTable({
      userId: v.id("users"),
      questionId: v.id("questions"),
      wrongCount: v.number(),
      lastWrong: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_question", ["userId", "questionId"]),

    // XP / level / daily streak per user.
    userStats: defineTable({
      userId: v.id("users"),
      xp: v.number(),
      streak: v.number(),
      lastActive: v.number(), // UTC day key (Date.now() / 86400000)
      level: v.number(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
