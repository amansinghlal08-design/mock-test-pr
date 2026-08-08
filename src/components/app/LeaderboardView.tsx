import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Crown, Flame, Target, Trophy, Users } from "lucide-react";
import { initials } from "@/lib/test";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardViewProps {
  onBack: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_STYLES = [
  "from-amber-400 to-yellow-500",
  "from-slate-300 to-slate-400",
  "from-orange-400 to-amber-600",
];

export function LeaderboardView({ onBack }: LeaderboardViewProps) {
  const data = useQuery(api.queries.leaderboard);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl"
    >
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Home
      </button>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Global rankings · {data?.totalPlayers ?? "…"} players
          </p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-black tracking-tight">
            Leaderboard <Trophy className="size-7 text-amber-500" />
          </h1>
        </div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Target className="size-4 text-primary" />
          Ranked by XP, then accuracy
        </p>
      </div>

      {data === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : data.rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-12 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Award className="size-8" />
          </div>
          <h3 className="mt-4 text-xl font-extrabold">No players yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Take your first test to claim the top spot on the board.
          </p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="mb-6 grid grid-cols-3 items-end gap-3">
            {[1, 0, 2].map((pos) => {
              const row = data.rows[pos];
              if (!row) return <div key={pos} />;
              const isMe = data.myUserId === row.userId;
              const height = pos === 0 ? "h-40" : pos === 1 ? "h-32" : "h-28";
              return (
                <motion.div
                  key={row.userId}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pos * 0.1, duration: 0.45 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative flex flex-col items-center">
                    <span className="text-3xl drop-shadow">{MEDALS[pos]}</span>
                    <span className="mt-1 grid size-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-extrabold text-white shadow-lg">
                      {initials(row.name)}
                    </span>
                    <p className="mt-2 max-w-24 truncate text-center text-sm font-extrabold">
                      {row.name}
                      {isMe && (
                        <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase text-primary-foreground">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      Lv {row.level} · {row.xp} XP
                    </p>
                  </div>
                  <div
                    className={`mt-3 flex w-full items-end justify-center rounded-t-2xl bg-gradient-to-t ${PODIUM_STYLES[pos]} pb-2 pt-3 text-2xl font-black text-white shadow-lg`}
                    style={{ height: pos === 0 ? "5.5rem" : pos === 1 ? "4.25rem" : "3.5rem" }}
                  >
                    #{pos + 1}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Ranked list */}
          <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            {data.rows.slice(3).map((r, i) => {
              const isMe = data.myUserId === r.userId;
              return (
                <motion.div
                  key={r.userId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-4 px-5 py-3.5 ${
                    i % 2 === 1 ? "bg-muted/30" : ""
                  } ${isMe ? "bg-primary/10" : ""}`}
                >
                  <span
                    className={`w-8 text-center font-mono text-sm font-black ${
                      isMe ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-extrabold text-white">
                    {initials(r.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">
                      {r.name}
                      {isMe && (
                        <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase text-primary-foreground">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.tests} {r.tests === 1 ? "test" : "tests"} ·{" "}
                      <span className="font-semibold">{r.accuracy}% accuracy</span>
                    </p>
                  </div>
                  <div className="hidden items-center gap-3 text-right sm:flex">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Flame className="size-3.5" /> {r.streak}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-500">
                      <Crown className="size-3.5" /> Lv {r.level}
                    </span>
                  </div>
                  <span className="w-20 text-right font-mono text-sm font-black tabular-nums text-foreground/80">
                    {r.xp.toLocaleString()} XP
                  </span>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Users className="size-3.5" /> Top 50 of {data.totalPlayers} players shown
          </p>
        </>
      )}
    </motion.div>
  );
}
