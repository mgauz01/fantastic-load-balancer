import { useEffect, useMemo, useRef } from "react";
import type { BackendPool, RequestLogEntry } from "../../sim/types";
import {
  STAGE_HEIGHT,
  STAGE_TICK_MS,
  STAGE_WIDTH,
  buildStageLayout,
  createStageTrafficState,
  drawTrafficStage,
  enqueueStageRequest,
  tickStageTraffic,
  type StageLayout,
  type StageTrafficState,
} from "./trafficStage";

interface TrafficStageProps {
  latestEntry: RequestLogEntry | null;
  pools: Record<string, BackendPool>;
  paused?: boolean;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function TrafficStage({ latestEntry, pools, paused = false }: TrafficStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<StageLayout>(buildStageLayout(pools));
  const stateRef = useRef<StageTrafficState>(createStageTrafficState(layoutRef.current));
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const frozenRef = useRef(prefersReducedMotion());
  const lastEntryIdRef = useRef<string | null>(null);

  const structureKey = useMemo(
    () =>
      Object.values(pools)
        .flatMap((pool) => pool.backends.map((backend) => backend.id))
        .sort()
        .join("|"),
    [pools],
  );

  useEffect(() => {
    layoutRef.current = buildStageLayout(pools);
    stateRef.current = createStageTrafficState(layoutRef.current);
    lastEntryIdRef.current = null;
    // Reset animation only when backend topology changes (retry / level load).
  }, [structureKey]);

  useEffect(() => {
    if (!latestEntry || latestEntry.id === lastEntryIdRef.current) {
      return;
    }
    lastEntryIdRef.current = latestEntry.id;
    stateRef.current = enqueueStageRequest(stateRef.current, latestEntry, layoutRef.current);
  }, [latestEntry]);

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
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || STAGE_WIDTH;
      const scale = Math.max(1, Math.floor(displayWidth / STAGE_WIDTH));

      canvas.width = STAGE_WIDTH * dpr * scale;
      canvas.height = STAGE_HEIGHT * dpr * scale;
      drawTrafficStage(ctx, layoutRef.current, stateRef.current, dpr * scale);
    };

    resize();
    window.addEventListener("resize", resize);

    const frame = (now: number) => {
      layoutRef.current = buildStageLayout(pools);

      if (!document.hidden && !frozenRef.current && !paused) {
        if (now - lastTickRef.current >= STAGE_TICK_MS) {
          lastTickRef.current = now;
          stateRef.current = tickStageTraffic(stateRef.current, STAGE_TICK_MS, layoutRef.current, {
            paused: document.hidden || paused,
            frozen: frozenRef.current,
          });
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || STAGE_WIDTH;
      const scale = Math.max(1, Math.floor(displayWidth / STAGE_WIDTH));
      drawTrafficStage(ctx, layoutRef.current, stateRef.current, dpr * scale);
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
  }, [paused, pools]);

  return (
    <section className="play-panel">
      <h2 className="play-panel__title">STAGE</h2>
      <div className="play-panel__body">
        <canvas
          ref={canvasRef}
          className="play-stage-canvas traffic-stage"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
