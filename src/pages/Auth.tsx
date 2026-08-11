import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useAction, useConvex, useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  UserX,
  Zap,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

type Mode = "signIn" | "register" | "reset";

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const convex = useConvex();
  const resetPassword = useMutation(api.password.resetPassword);
  const sendOtpEmail = useAction(api.otp.sendOtpEmail);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<Mode>("signIn");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  /** Random 6-digit code, emailed to the user for verification. */
  const generateOtp = () =>
    String(Math.floor(100000 + Math.random() * 900000));

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const normalized = email.trim().toLowerCase();
    try {
      // Smart routing: unknown email → jump straight to registration, prefilled.
      const exists = await convex.query(api.admin.emailExists, {
        email: normalized,
      });
      if (!exists) {
        setMode("register");
        setStep("form");
        setDemoOtp(null);
        setIsLoading(false);
        toast.info(
          "No account found for that email — create one below. ✨",
          { description: "We've pre-filled your email." },
        );
        return;
      }
      await signIn("password", { email: normalized, password });
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Sign in failed. Check your email and password.",
      );
      setIsLoading(false);
    }
  };

  const handleRegisterForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    // Send a real 6-digit code to the user's email.
    setIsLoading(true);
    try {
      const code = generateOtp();
      const res = await sendOtpEmail({
        email: email.trim().toLowerCase(),
        code,
      });
      if (!res.ok) {
        setError(
          res.error ?? "Could not send the verification code. Please try again.",
        );
        setIsLoading(false);
        return;
      }
      setDemoOtp(code);
      setOtp("");
      setStep("otp");
    } catch (e) {
      console.error("Send OTP error:", e);
      setError("Could not send the verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /** Re-send the current verification code to the user's email. */
  const handleResendOtp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const code = generateOtp();
      const res = await sendOtpEmail({
        email: email.trim().toLowerCase(),
        code,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not resend the code. Please try again.");
        setIsLoading(false);
        return;
      }
      setDemoOtp(code);
      setOtp("");
      toast.success("A new code was sent to your email ✉️");
    } catch (e) {
      console.error("Resend OTP error:", e);
      setError("Could not resend the code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp !== demoOtp) {
      setError("That code doesn't match. Try again.");
      setOtp("");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", {
        flow: "signUp",
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    } catch (error) {
      console.error("Sign up error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Could not create your account. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const normalized = email.trim().toLowerCase();
    try {
      const exists = await convex.query(api.admin.emailExists, {
        email: normalized,
      });
      if (!exists) {
        setError("No account found for that email.");
        setIsLoading(false);
        return;
      }
      // Send a real 6-digit reset code to the user's email.
      const code = generateOtp();
      const res = await sendOtpEmail({ email: normalized, code });
      if (!res.ok) {
        setError(res.error ?? "Could not send the reset code. Please try again.");
        setIsLoading(false);
        return;
      }
      setDemoOtp(code);
      setOtp("");
      setNewPassword("");
      setStep("otp");
      setIsLoading(false);
    } catch (error) {
      console.error("Reset request error:", error);
      setError("Could not start the reset. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResetConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp !== demoOtp) {
      setError("That code doesn't match. Try again.");
      setOtp("");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await resetPassword({
        email: email.trim().toLowerCase(),
        newPassword,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not reset the password.");
        setIsLoading(false);
        return;
      }
      toast.success("Password reset — sign in with your new password ✨");
      setMode("signIn");
      setStep("form");
      setPassword("");
      setNewPassword("");
      setOtp("");
      setDemoOtp(null);
      setIsLoading(false);
    } catch (error) {
      console.error("Reset error:", error);
      setError(
        error instanceof Error ? error.message : "Could not reset the password.",
      );
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      setIsLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep("form");
    setDemoOtp(null);
    setOtp("");
    setNewPassword("");
    setError(null);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed -left-32 top-0 size-[420px] rounded-full bg-indigo-500/15 blur-[110px]" />
      <div className="pointer-events-none fixed -right-32 bottom-0 size-[420px] rounded-full bg-amber-400/15 blur-[110px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center gap-16 px-5 py-10 lg:justify-between">
        {/* Brand pitch */}
        <div className="hidden max-w-md lg:block">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to home
          </Link>
          <span className="mt-8 flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/30">
              M
            </span>
            <span className="text-2xl font-extrabold tracking-tight">
              MockTest<span className="text-amber-500">.pro</span>
            </span>
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight">
            Your score starts <span className="text-gradient">here</span>.
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            One account and you're in. Your XP, streak, weak spots and progress
            follow you everywhere — on any device.
          </p>
          <div className="mt-8 space-y-4">
            {[
              { icon: Timer, text: "Timed tests with instant scoring" },
              { icon: Zap, text: "XP, levels and daily streaks" },
              { icon: Flame, text: "Weak-spot tracking that learns" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm font-medium">
                <span className="grid size-9 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  <f.icon className="size-4" />
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Auth card */}
        <div className="w-full max-w-md">
          <Card className="border shadow-xl">
            <AnimatePresence mode="wait">
              {step === "form" ? (
                <motion.div
                  key={`${mode}-form`}
                  initial={{ opacity: 0, x: mode === "signIn" ? -24 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "signIn" ? 24 : -24 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <CardHeader className="text-center">
                    <div className="mb-2 flex justify-center lg:hidden">
                      <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-xl font-extrabold text-white shadow-lg shadow-indigo-500/30">
                        M
                      </span>
                    </div>
                    <CardTitle className="text-2xl">
                      {mode === "signIn"
                        ? "Welcome back"
                        : mode === "register"
                          ? "Create your account"
                          : "Reset your password"}
                    </CardTitle>
                    <CardDescription>
                      {mode === "signIn"
                        ? "Sign in with your email and password"
                        : mode === "register"
                          ? "It takes less than a minute — name, email & password"
                          : "We'll send a code to your email to verify it's you"}
                    </CardDescription>
                  </CardHeader>

                  <form
                    onSubmit={
                      mode === "signIn"
                        ? handleLogin
                        : mode === "register"
                          ? handleRegisterForm
                          : handleResetRequest
                    }
                  >
                    <CardContent className="space-y-3">
                      {mode === "register" && (
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full name"
                            className="h-11 pl-9"
                            disabled={isLoading}
                            autoFocus
                          />
                        </div>
                      )}
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          type="email"
                          className="h-11 pl-9"
                          disabled={isLoading}
                          required
                        />
                      </div>
                      {mode !== "reset" && (
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={
                              mode === "register"
                                ? "Password (min 6 characters)"
                                : "Password"
                            }
                            type="password"
                            className="h-11 pl-9"
                            disabled={isLoading}
                            required
                          />
                        </div>
                      )}

                      {mode === "signIn" && (
                        <div className="-mt-1 text-right">
                          <button
                            type="button"
                            onClick={() => switchMode("reset")}
                            className="text-xs font-bold text-primary hover:underline"
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}

                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}

                      <Button
                        type="submit"
                        className="h-11 w-full gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : mode === "signIn" ? (
                          <>
                            Sign in <ArrowRight className="h-4 w-4" />
                          </>
                        ) : mode === "register" ? (
                          <>
                            Continue <ArrowRight className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <KeyRound className="h-4 w-4" /> Send reset code
                          </>
                        )}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        {mode === "signIn" ? (
                          <>
                            New to MockTest.pro?{" "}
                            <button
                              type="button"
                              onClick={() => switchMode("register")}
                              className="font-bold text-primary hover:underline"
                            >
                              Create an account
                            </button>
                          </>
                        ) : (
                          <>
                            Already have an account?{" "}
                            <button
                              type="button"
                              onClick={() => switchMode("signIn")}
                              className="font-bold text-primary hover:underline"
                            >
                              Sign in
                            </button>
                          </>
                        )}
                      </p>

                      {mode === "signIn" && (
                        <div>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-card px-2 text-muted-foreground">
                                Or
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="mt-3 h-11 w-full"
                            onClick={handleGuestLogin}
                            disabled={isLoading}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Continue as Guest
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <CardHeader className="mt-2 text-center">
                    <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
                      <Sparkles className="size-6" />
                    </div>
                    <CardTitle>
                      {mode === "reset" ? "Reset your password" : "Verify your email"}
                    </CardTitle>
                    <CardDescription>
                      {mode === "reset" ? (
                        <>A reset code is on its way to </>
                      ) : (
                        <>We've sent a code to </>
                      )}
                      <span className="font-semibold text-foreground">
                        {email.trim().toLowerCase()}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={mode === "reset" ? handleResetConfirm : handleRegisterOtp}>
                    <CardContent className="pb-4">
                      <div className="flex justify-center">
                        <InputOTP
                          value={otp}
                          onChange={setOtp}
                          maxLength={6}
                          disabled={isLoading}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                              const form = (e.target as HTMLElement).closest("form");
                              if (form) form.requestSubmit();
                            }
                          }}
                        >
                          <InputOTPGroup>
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot key={index} index={index} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      {demoOtp && (
                        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5">
                          <Mail className="size-4 shrink-0 text-emerald-500" />
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            A 6-digit code was sent to your email — check your
                            inbox (and spam folder).
                          </p>
                        </div>
                      )}

                      {mode === "reset" && (
                        <div className="relative mt-3">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (min 6 characters)"
                            type="password"
                            className="h-11 pl-9"
                            disabled={isLoading}
                            required
                          />
                        </div>
                      )}

                      {error && (
                        <p className="mt-2 text-center text-sm text-destructive">
                          {error}
                        </p>
                      )}
                      <p className="mt-3 text-center text-xs text-muted-foreground">
                        Didn't get it? Check spam, or resend the code below.
                      </p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                      <Button
                        type="submit"
                        className="h-11 w-full"
                        disabled={isLoading || otp.length !== 6}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {mode === "reset" ? "Resetting…" : "Creating account…"}
                          </>
                        ) : (
                          <>
                            {mode === "reset" ? "Reset password" : "Verify & create account"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Resend code
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setStep("form");
                          setError(null);
                        }}
                        disabled={isLoading}
                        className="w-full"
                      >
                        Back
                      </Button>
                    </CardFooter>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t bg-muted/50 px-6 py-4 text-center text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Secured by freebuff.com — your data stays private
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
