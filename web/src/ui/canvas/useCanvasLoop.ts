import { useEffect, useRef, type RefObject } from "react";
import { prefersReducedMotion } from "../../lib/motion";

export interface CanvasLoopHandlers {
  setupCanvas: (canvas: HTMLCanvasElement) => number;
  onTick: () => void;
  onDraw: (ctx: CanvasRenderingContext2D, drawScale: number) => void;
}

export function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  tickMs: number,
  paused: boolean | undefined,
  handlers: CanvasLoopHandlers,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawScale = 1;
    let frozen = prefersReducedMotion();
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReducedChange = () => {
      frozen = reducedMq.matches;
    };
    reducedMq.addEventListener("change", onReducedChange);

    const resize = () => {
      drawScale = handlersRef.current.setupCanvas(canvas);
      handlersRef.current.onDraw(ctx, drawScale);
    };

    resize();
    window.addEventListener("resize", resize);

    let lastTick = 0;
    let raf: number | null = null;

    const frame = (now: number) => {
      if (!document.hidden && !frozen && !paused) {
        if (now - lastTick >= tickMs) {
          lastTick = now;
          handlersRef.current.onTick();
        }
      }

      handlersRef.current.onDraw(ctx, drawScale);
      raf = window.requestAnimationFrame(frame);
    };

    raf = window.requestAnimationFrame(frame);

    return () => {
      reducedMq.removeEventListener("change", onReducedChange);
      window.removeEventListener("resize", resize);
      if (raf !== null) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [canvasRef, paused, tickMs]);
}
