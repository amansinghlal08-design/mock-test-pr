import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  Brain,
  Check,
  Clock3,
  Flame,
  Gauge,
  Lightbulb,
  Smartphone,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const, delay: i * 0.08 },
  }),
};

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30">
        M
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-foreground"}`}>
        MockTest<span className="text-amber-500">.pro</span>
      </span>
    </span>
  );
}

export default function Landing() {
  const { scrollY } = useScroll();
  const heroGlow = useTransform(scrollY, [0, 600], [1, 0.25]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* ================= NAVBAR ================= */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" aria-label="MockTest.pro home">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
            <a href="#subjects" className="transition-colors hover:text-white">Subjects</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white/85 transition-colors hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              to="/auth?returnTo=%2Fdashboard"
              className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-bold text-slate-900 shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:brightness-105"
            >
              Start free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-[#0d1026] pb-24 pt-32 text-white">
        <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" />
        <motion.div
          style={{ opacity: heroGlow }}
          className="pointer-events-none absolute -left-32 top-0 size-[480px] rounded-full bg-indigo-600/40 blur-[120px]"
        />
        <motion.div
          style={{ opacity: heroGlow }}
          className="pointer-events-none absolute -right-24 top-40 size-[420px] rounded-full bg-fuchsia-600/30 blur-[120px]"
        />
        <motion.div
          style={{ opacity: heroGlow }}
          className="pointer-events-none absolute bottom-0 left-1/3 size-[360px] rounded-full bg-amber-500/20 blur-[110px]"
        />

        <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-indigo-200 backdrop-blur"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              Timed mock tests · Built for exam prep
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="show"
              className="mt-6 text-balance text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl"
            >
              Practice under{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                real exam pressure.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              initial="hidden"
              animate="show"
              className="mt-6 max-w-xl text-lg leading-relaxed text-indigo-100/75"
            >
              Take timed mock tests across GK, Maths, English, Reasoning and
              Science. Get instant answers with explanations, earn XP, keep your
              streak alive, and turn every wrong answer into a lesson.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              initial="hidden"
              animate="show"
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/auth?returnTo=%2Fdashboard"
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-base font-bold text-white shadow-xl shadow-indigo-500/40 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/60"
              >
                Start practicing free
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#subjects"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                Browse subjects
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={4}
              initial="hidden"
              animate="show"
              className="mt-12 grid max-w-lg grid-cols-3 gap-6"
            >
              {[
                { value: "140+", label: "Questions" },
                { value: "5", label: "Subjects" },
                { value: "99", label: "Levels to climb" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold text-white sm:text-3xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs font-medium uppercase tracking-wider text-indigo-200/60">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Floating test card mock */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: 2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.25 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-amber-500/20 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200">
                  GK · World Geography
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 font-mono text-xs font-bold text-rose-300">
                  <Timer className="size-3.5" /> 08:42
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold leading-snug">
                नील नदी किस महाद्वीप में है?
              </h3>
              <div className="mt-5 space-y-2.5">
                {[
                  { k: "A", t: "एशिया", state: "" },
                  { k: "B", t: "अफ्रीका", state: "correct" },
                  { k: "C", t: "यूरोप", state: "" },
                  { k: "D", t: "ऑस्ट्रेलिया", state: "" },
                ].map((o) => (
                  <div
                    key={o.k}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
                      o.state === "correct"
                        ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                        : "border-white/10 bg-white/5 text-white/80"
                    }`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${
                        o.state === "correct"
                          ? "bg-emerald-400 text-emerald-950"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {o.k}
                    </span>
                    {o.t}
                    {o.state === "correct" && <Check className="ml-auto size-4" />}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-200">
                <span className="inline-flex items-center gap-1.5">
                  <Lightbulb className="size-4 text-amber-300" />
                  <b>Explanation:</b> नील नदी अफ्रीका में है।
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 font-bold text-emerald-300">
                  <Zap className="size-3.5" /> +10 XP
                </span>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 -top-6 rounded-2xl border border-white/10 bg-[#171b3a] px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Flame className="size-4" /> 12-day streak
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-4 rounded-2xl border border-white/10 bg-[#171b3a] px-4 py-3 shadow-xl"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                <Award className="size-4 text-amber-400" /> Level 12 · 1,240 XP
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================= SUBJECTS ================= */}
      <section id="subjects" className="mx-auto max-w-6xl px-5 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <BookOpenCheck className="size-3.5" /> Subjects
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-black tracking-tight sm:text-5xl">
            Five subjects. <span className="text-gradient">One goal.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            A curated question bank that covers the classics — from world
            geography to arithmetic, grammar, reasoning series and physics.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { name: "GK", emoji: "🌍", count: "40", grad: "from-indigo-500 to-violet-500", blurb: "Geography & history" },
            { name: "Maths", emoji: "🔢", count: "40", grad: "from-amber-500 to-orange-500", blurb: "Arithmetic & geometry" },
            { name: "English", emoji: "🇬🇧", count: "20", grad: "from-sky-500 to-blue-600", blurb: "Grammar & nouns" },
            { name: "Reasoning", emoji: "🧩", count: "20", grad: "from-emerald-500 to-teal-500", blurb: "Series & patterns" },
            { name: "Science", emoji: "🔬", count: "20", grad: "from-rose-500 to-pink-600", blurb: "Physics fundamentals" },
          ].map((s, i) => (
            <motion.div
              key={s.name}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="group relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-xl"
            >
              <div
                className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${s.grad} text-xl shadow-lg`}
              >
                {s.emoji}
              </div>
              <h3 className="mt-4 text-lg font-extrabold">{s.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.blurb}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-mono font-bold text-foreground/80">
                  {s.count} questions
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="border-y bg-muted/40 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Sparkles className="size-3.5" /> Features
            </span>
            <h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-black tracking-tight sm:text-5xl">
              Everything you need to{" "}
              <span className="text-gradient">study smarter</span>
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Timer,
                tint: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
                title: "Real timed exams",
                desc: "Every test runs against a countdown with automatic submission — exactly the pressure of the real exam hall.",
              },
              {
                icon: Lightbulb,
                tint: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
                title: "Instant explanations",
                desc: "The moment you answer, you see whether you're right — and why. Learning happens inside the test.",
              },
              {
                icon: Brain,
                tint: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
                title: "Weak-spot tracking",
                desc: "Every wrong answer is remembered. Weak Practice and Hard Drill resurface exactly what you keep missing.",
              },
              {
                icon: TrendingUp,
                tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                title: "XP, levels & streaks",
                desc: "Earn 10 XP per correct answer, climb to Level 99, and keep your daily streak burning.",
              },
              {
                icon: BarChart3,
                tint: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
                title: "Per-subject analytics",
                desc: "Watch your accuracy improve across categories with clean, honest charts.",
              },
              {
                icon: Smartphone,
                tint: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
                title: "Works on any device",
                desc: "Phone, tablet or laptop — a fast, focused test experience wherever you are.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                className="group rounded-3xl border bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
              >
                <div className={`grid size-12 place-items-center rounded-2xl ${f.tint}`}>
                  <f.icon className="size-6" />
                </div>
                <h3 className="mt-5 text-lg font-extrabold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Target className="size-3.5" /> How it works
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-black tracking-tight sm:text-5xl">
            Three steps to exam-ready
          </h2>
        </motion.div>

        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-8 hidden border-t-2 border-dashed border-muted-foreground/20 md:block" />
          {[
            {
              n: "01",
              icon: Gauge,
              title: "Pick a subject",
              desc: "Choose a category and topic — or go for a full-category mock with the whole bank.",
            },
            {
              n: "02",
              icon: Clock3,
              title: "Answer under time",
              desc: "Options shuffle every run. Answer, learn instantly, and watch the countdown. No registration friction.",
            },
            {
              n: "03",
              icon: TrendingUp,
              title: "Review & improve",
              desc: "Score ring, XP, and a full answer review with explanations. Weak spots are tracked for you.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="relative rounded-3xl border bg-card p-8 text-center shadow-sm"
            >
              <div className="absolute right-6 top-5 font-mono text-4xl font-black text-muted-foreground/10">
                {s.n}
              </div>
              <div className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
                <s.icon className="size-7" />
              </div>
              <h3 className="mt-5 text-lg font-extrabold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="px-5 pb-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-[#0d1026] px-8 py-16 text-center text-white shadow-2xl sm:px-16"
        >
          <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]" />
          <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-indigo-600/40 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 size-72 rounded-full bg-amber-500/30 blur-[100px]" />

          <div className="relative">
            <div className="text-4xl">⚡</div>
            <h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-black tracking-tight sm:text-5xl">
              Your first mock test takes{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-amber-400 bg-clip-text text-transparent">
                under a minute
              </span>{" "}
              to start.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-indigo-100/70">
              No downloads, no credit card, no setup. Sign in with your email —
              or continue as a guest — and start answering.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/auth?returnTo=%2Fdashboard"
                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-4 text-base font-bold text-slate-900 shadow-xl shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:brightness-105"
              >
                Take a timed test now
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
          <Brand />
          <p className="text-sm text-muted-foreground">
            Practice smart · Score higher · Level 99
          </p>
          <div className="flex items-center gap-5 text-sm font-medium text-muted-foreground">
            <a href="#subjects" className="transition-colors hover:text-foreground">Subjects</a>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <Link to="/auth" className="transition-colors hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
