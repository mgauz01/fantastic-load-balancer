import { useCallback, useEffect, useRef, useState } from "react";
import { evaluateAttempt } from "../game/evaluator";
import { buildSimConfig, healthEventsForTick, spawnRequestsForTick } from "../game/levelSim";
import type { CampaignLevel } from "../game/types";
import {
  createSimEngine,
  setBackendHealth,
  setPhase,
  tick,
  type SimEngineState,
} from "../sim/engine";
import { cumulativeSuccessRate } from "../sim/metrics";

const TICK_MS = 1000;

export interface SimSessionResult {
  status: "running" | "passed" | "failed_time" | "failed_early";
}

interface UseSimSessionOptions {
  onResult?: (result: SimSessionResult) => void;
}

export function useSimSession(level: CampaignLevel, options: UseSimSessionOptions = {}) {
  const [state, setState] = useState<SimEngineState>(() =>
    createSimEngine(buildSimConfig(level)),
  );
  const sequenceRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const onResultRef = useRef(options.onResult);
  onResultRef.current = options.onResult;

  const applyHealthEvents = useCallback(
    (engine: SimEngineState, activeTick: number) => {
      let next = engine;
      for (const event of healthEventsForTick(level, activeTick)) {
        next = setBackendHealth(next, event.backendId, event.health);
      }
      return next;
    },
    [level],
  );

  const advanceTick = useCallback(() => {
    setState((current) => {
      if (current.phase !== "running") {
        return current;
      }

      const nextTick = current.activeTrafficTicks + 1;
      let next = applyHealthEvents(current, nextTick);
      const incoming = spawnRequestsForTick(level, nextTick, sequenceRef.current++);
      next = tick(next, { incoming });

      const remaining = Math.max(
        0,
        level.passThreshold.durationTicks - next.activeTrafficTicks,
      );
      const status = evaluateAttempt(level, {
        activeTrafficTicks: next.activeTrafficTicks,
        metrics: next.metrics,
        estimatedRemainingRequests: remaining,
      });

      if (status !== "running") {
        onResultRef.current?.({ status });
      }

      return next;
    });
  }, [applyHealthEvents, level]);

  useEffect(() => {
    if (state.phase !== "running") {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const frame = (now: number) => {
      if (lastTickAtRef.current === 0) {
        lastTickAtRef.current = now;
      }

      if (now - lastTickAtRef.current >= TICK_MS) {
        lastTickAtRef.current = now;
        advanceTick();
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [advanceTick, state.phase]);

  const pause = useCallback(() => {
    setState((current) => setPhase(current, "configure"));
  }, []);

  const resume = useCallback(() => {
    lastTickAtRef.current = 0;
    setState((current) => setPhase(current, "running"));
  }, []);

  const retry = useCallback(() => {
    sequenceRef.current = 0;
    lastTickAtRef.current = 0;
    setState(createSimEngine(buildSimConfig(level)));
  }, [level]);

  const successRate = cumulativeSuccessRate(state.metrics);

  return {
    state,
    pause,
    resume,
    retry,
    successRate,
    isRunning: state.phase === "running",
    isPaused: state.phase === "configure",
  };
}
