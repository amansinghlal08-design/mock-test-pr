import { action } from "./_generated/server";
import { v } from "convex/values";

const EMAIL_API_ENDPOINT = "https://auth.freebuff.app/send_otp";

/**
 * Email a 6-digit verification code to the user via the freebuff email
 * service — the same endpoint used by the auth `emailOtp` provider.
 *
 * The code itself is generated on the client and compared on the client, so
 * it never travels back over the network; it only goes to the user's inbox.
 * The API key can be overridden with FREEBUFF_EMAIL_API_KEY (Keys tab),
 * otherwise it falls back to the project key already used in auth/emailOtp.ts.
 */
export const sendOtpEmail = action({
  args: {
    email: v.string(),
    code: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email || !/^\d{6}$/.test(args.code)) {
      return { ok: false, error: "Invalid email or code." };
    }
    const apiKey =
      process.env.FREEBUFF_EMAIL_API_KEY ?? "fb_email_2crN1hqIArZP2bEfvjp5Qik4";
    const appName = process.env.VLY_APP_NAME || "MockTest.pro";
    try {
      const res = await fetch(EMAIL_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ to: email, otp: args.code, appName }),
      });
      if (!res.ok) {
        console.error(
          "sendOtpEmail: service responded",
          res.status,
          await res.text(),
        );
        return {
          ok: false,
          error: "The email service is busy — please try again.",
        };
      }
      return { ok: true };
    } catch (error) {
      console.error("sendOtpEmail failed:", error);
      return { ok: false, error: "Could not send the email — please try again." };
    }
  },
});
