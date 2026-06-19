import { useEffect, useRef } from "react";
import {
  DECOR_HEIGHT,
  DECOR_TICK_MS,
  DECOR_WIDTH,
  createDecorTrafficState,
  drawDecorTraffic,
  tickDecorTraffic,
  type DecorTrafficState,
} from "./trafficDecor";
import "./intro-backdrop.css";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function IntroTrafficBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<DecorTrafficState>(createDecorTrafficState());
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const frozenRef = useRef(prefersReducedMotion());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReducedChange = () => {
      frozenRef.current = reducedMq.matches;
    };
    reducedMq.addEventListener("change", onReducedChange);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const scale = Math.max(
        window.innerWidth / DECOR_WIDTH,
        window.innerHeight / DECOR_HEIGHT,
      );
      const displayScale = Math.ceil(scale * 2) / 2;

      canvas.width = DECOR_WIDTH * dpr;
      canvas.height = DECOR_HEIGHT * dpr;
      canvas.style.width = `${DECOR_WIDTH * displayScale}px`;
      canvas.style.height = `${DECOR_HEIGHT * displayScale}px`;

      drawDecorTraffic(ctx, stateRef.current, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const frame = (now: number) => {
      if (!document.hidden && !frozenRef.current) {
        if (now - lastTickRef.current >= DECOR_TICK_MS) {
          const delta = now - lastTickRef.current;
          lastTickRef.current = now;
          stateRef.current = tickDecorTraffic(stateRef.current, delta, {
            paused: document.hidden,
            frozen: frozenRef.current,
          });
        }
      }

      const dpr = window.devicePixelRatio || 1;
      drawDecorTraffic(ctx, stateRef.current, dpr);
      rafRef.current = window.requestAnimationFrame(frame);
    };

    rafRef.current = window.requestAnimationFrame(frame);

    return () => {
      reducedMq.removeEventListener("change", onReducedChange);
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="intro-traffic-backdrop"
      aria-hidden="true"
    />
  );
}
