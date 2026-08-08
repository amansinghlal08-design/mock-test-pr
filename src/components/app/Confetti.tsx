import { useEffect, useRef } from "react";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  s: number;
  c: string;
  r: number;
  vr: number;
}

/** Full-screen celebratory confetti burst. Renders once, cleans itself up. */
export function ConfettiBurst() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces: Piece[] = Array.from({ length: 170 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 240,
      y: window.innerHeight / 3,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -15 - 5,
      g: 0.35,
      s: Math.random() * 8 + 4,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
    }));

    let frames = 0;
    let raf = 0;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      frames++;
      if (frames < 200) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-[70]"
      aria-hidden
    />
  );
}
