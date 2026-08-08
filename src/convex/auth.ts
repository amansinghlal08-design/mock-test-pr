// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

/**
 * Email + password provider. The `profile` callback copies the user's name
 * (used on the leaderboard) into the users table on sign-up. Passwords are
 * hashed with scrypt by the provider.
 */
const password = Password({
  profile(params) {
    return {
      name: (params.name as string | undefined) ?? "",
      email: (params.email as string | undefined) ?? "",
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password, emailOtp, Anonymous],
});