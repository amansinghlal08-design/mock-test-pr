import { motion } from "framer-motion";

const R = 84;
const CIRC = 2 * Math.PI * R;

/** Animated circular percentage ring, used on the result screen. */
export function ScoreRing({ pct }: { pct: number }) {
  return (
    <div className="relative mx-auto size-48">
      <svg viewBox="0 0 200 200" className="size-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="13"
          className="stroke-muted"
        />
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          stroke="url(#ringGradient)"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: CIRC * (1 - Math.min(100, pct) / 100) }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.25 }}
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="55%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-4xl font-black tabular-nums tracking-tight">
            {Math.round(pct)}%
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Score
          </div>
        </div>
      </div>
    </div>
  );
}
