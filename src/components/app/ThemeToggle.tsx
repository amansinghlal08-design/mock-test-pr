import { useTheme } from "@/hooks/use-theme";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

/** Sun/Moon dark-mode toggle for the top header. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative grid size-8 place-items-center overflow-hidden rounded-full border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 14, opacity: 0, rotate: -60 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -14, opacity: 0, rotate: 60 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid place-items-center"
        >
          {isDark ? (
            <Moon className="size-4 text-indigo-300" />
          ) : (
            <Sun className="size-4 text-amber-500" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
