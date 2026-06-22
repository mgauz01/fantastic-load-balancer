import { useRef } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_TICK_MS,
  CANVAS_WIDTH,
  createIntroTrafficState,
  drawIntroTraffic,
  tickIntroTraffic,
  type IntroTrafficState,
} from "../canvas/trafficStage";
import { useCanvasLoop } from "../canvas/useCanvasLoop";
import "./intro-backdrop.css";

export default function IntroTrafficBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<IntroTrafficState>(createIntroTrafficState());

  useCanvasLoop(canvasRef, CANVAS_TICK_MS, false, {
    setupCanvas: (canvas) => {
      const dpr = window.devicePixelRatio || 1;
      const scale = Math.max(
        window.innerWidth / CANVAS_WIDTH,
        window.innerHeight / CANVAS_HEIGHT,
      );
      const displayScale = Math.ceil(scale * 2) / 2;

      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      canvas.style.width = `${CANVAS_WIDTH * displayScale}px`;
      canvas.style.height = `${CANVAS_HEIGHT * displayScale}px`;
      return dpr;
    },
    onTick: () => {
      stateRef.current = tickIntroTraffic(stateRef.current);
    },
    onDraw: (ctx, drawScale) => {
      drawIntroTraffic(ctx, stateRef.current, drawScale);
    },
  });

  return (
    <canvas
      ref={canvasRef}
      className="intro-traffic-backdrop"
      aria-hidden="true"
    />
  );
}
