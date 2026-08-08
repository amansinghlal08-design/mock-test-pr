import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Scrypt } from "lucia";

/**
 * Reset a user's password for the `password` provider.
 *
 * The reset code itself is simulated on the client (matching the app's
 * simulated OTP registration). The server's job here is to re-hash the new
 * password exactly like the Password provider does (scrypt via lucia) and
 * store it on the matching `authAccounts` row, then invalidate every existing
 * session so the old password stops working everywhere.
 */
export const resetPassword = mutation({
  args: {
    email: v.string(),
    newPassword: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) return { ok: false, error: "Enter your email address." };
    if (!args.newPassword || args.newPassword.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." };
    }

    // Find the email+password account row (created by the Password provider).
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .unique();
    if (!account) {
      return { ok: false, error: "No account found for that email." };
    }

    // Re-hash with the exact algorithm the provider uses on sign-in.
    const hashed = await new Scrypt().hash(args.newPassword);
    await ctx.db.patch(account._id, { secret: hashed });

    // Log the user out everywhere so the old password is dead.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", account.userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    return { ok: true };
  },
});
