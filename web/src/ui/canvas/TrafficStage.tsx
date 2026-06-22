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
import { useCanvasLoop } from "./useCanvasLoop";

interface TrafficStageProps {
  latestEntry: RequestLogEntry | null;
  pools: Record<string, BackendPool>;
  paused?: boolean;
}

export default function TrafficStage({ latestEntry, pools, paused = false }: TrafficStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poolsRef = useRef(pools);
  poolsRef.current = pools;

  const layoutRef = useRef<StageLayout>(buildStageLayout(pools));
  const stateRef = useRef<StageTrafficState>(createStageTrafficState(layoutRef.current));
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
  }, [structureKey, pools]);

  useEffect(() => {
    if (!latestEntry || latestEntry.id === lastEntryIdRef.current) {
      return;
    }
    lastEntryIdRef.current = latestEntry.id;
    stateRef.current = enqueueStageRequest(stateRef.current, latestEntry, layoutRef.current);
  }, [latestEntry]);

  useCanvasLoop(canvasRef, STAGE_TICK_MS, paused, {
    setupCanvas: (canvas) => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || STAGE_WIDTH;
      const scale = Math.max(1, Math.floor(displayWidth / STAGE_WIDTH));

      canvas.width = STAGE_WIDTH * dpr * scale;
      canvas.height = STAGE_HEIGHT * dpr * scale;
      return dpr * scale;
    },
    onTick: () => {
      layoutRef.current = buildStageLayout(poolsRef.current);
      stateRef.current = tickStageTraffic(stateRef.current, STAGE_TICK_MS, layoutRef.current);
    },
    onDraw: (ctx, drawScale) => {
      layoutRef.current = buildStageLayout(poolsRef.current);
      drawTrafficStage(ctx, layoutRef.current, stateRef.current, drawScale);
    },
  });

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
