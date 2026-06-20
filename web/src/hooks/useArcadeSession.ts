import { useCallback, useEffect, useRef, useState } from "react";
import {
  ARCADE_RECOVERY_TICKS,
  applyRouteToScore,
  arcadeGameOverReason,
  buildArcadeSimConfig,
  buildGameOverResult,
  createArcadeScoreState,
  pickRandomHealthyBackend,
  shouldInjectBackendFailure,
  spawnArcadeRequests,
  spawnRateForTick,
  type ArcadeGameOverResult,
  type ArcadeScoreState,
} from "../game/arcade";
import {
  createSimEngine,
  setBackendHealth,
  setPhase,
  tick,
  type SimEngineState,
} from "../sim/engine";
import { cumulativeSuccessRate } from "../sim/metrics";
import { createSeededRandom } from "../sim/rng";
import { useRuleMutations } from "./useRuleMutations";

const TICK_MS = 1000;

interface UseArcadeSessionOptions {
  onGameOver?: (result: ArcadeGameOverResult) => void;
}

export function useArcadeSession(options: UseArcadeSessionOptions = {}) {
  const [state, setState] = useState<SimEngineState>(() =>
    createSimEngine(buildArcadeSimConfig()),
  );
  const [scoreState, setScoreState] = useState<ArcadeScoreState>(createArcadeScoreState);
  const [gameOver, setGameOver] = useState<ArcadeGameOverResult | null>(null);
  const scoreStateRef = useRef(scoreState);
  scoreStateRef.current = scoreState;

  const sequenceRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const gameOverRef = useRef(gameOver);
  gameOverRef.current = gameOver;
  const onGameOverRef = useRef(options.onGameOver);
  onGameOverRef.current = options.onGameOver;

  const advanceTick = useCallback(() => {
    if (gameOverRef.current) {
      return;
    }

    setState((current) => {
      if (current.phase !== "running") {
        return current;
      }

      const nextTick = current.activeTrafficTicks + 1;
      const spawnRate = spawnRateForTick(nextTick);
      let next = current;
      const recoveryTicks: Record<string, number> = {};

      if (shouldInjectBackendFailure(nextTick, spawnRate)) {
        const rng = createSeededRandom(next.rngSeed + nextTick);
        const backendId = pickRandomHealthyBackend(next.pools, rng);
        if (backendId) {
          next = setBackendHealth(next, backendId, "unhealthy");
          recoveryTicks[backendId] = ARCADE_RECOVERY_TICKS;
        }
      }

      const incoming = spawnArcadeRequests(nextTick, sequenceRef.current++);
      next = tick(next, { incoming, recoveryTicks });

      const latestEntry = next.log[next.log.length - 1];
      let nextScore = scoreStateRef.current;
      if (latestEntry) {
        nextScore = applyRouteToScore(scoreStateRef.current, latestEntry.outcome);
        scoreStateRef.current = nextScore;
        setScoreState(nextScore);
      }

      const reason = arcadeGameOverReason(next, nextScore.recentOutcomes);
      if (reason) {
        const result = buildGameOverResult(nextScore.score, next.activeTrafficTicks, reason);
        gameOverRef.current = result;
        setGameOver(result);
        onGameOverRef.current?.(result);
        return setPhase(next, "configure");
      }

      return next;
    });
  }, []);

  useEffect(() => {
    if (state.phase !== "running" || gameOver) {
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
  }, [advanceTick, gameOver, state.phase]);

  const pause = useCallback(() => {
    setState((current) => setPhase(current, "configure"));
  }, []);

  const resume = useCallback(() => {
    if (gameOverRef.current) return;
    lastTickAtRef.current = 0;
    setState((current) => setPhase(current, "running"));
  }, []);

  const retry = useCallback(() => {
    sequenceRef.current = 0;
    lastTickAtRef.current = 0;
    const freshScore = createArcadeScoreState();
    scoreStateRef.current = freshScore;
    setScoreState(freshScore);
    gameOverRef.current = null;
    setGameOver(null);
    setState(createSimEngine(buildArcadeSimConfig()));
  }, []);

  const { upsertRule, removeRule } = useRuleMutations(setState);

  const successRate = cumulativeSuccessRate(state.metrics);

  return {
    state,
    scoreState,
    gameOver,
    pause,
    resume,
    retry,
    upsertRule,
    removeRule,
    successRate,
    spawnRate: spawnRateForTick(state.activeTrafficTicks),
    isRunning: state.phase === "running" && !gameOver,
    isPaused: state.phase === "configure" || gameOver !== null,
  };
}
