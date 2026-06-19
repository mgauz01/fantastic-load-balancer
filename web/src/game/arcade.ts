import type { SimEngineConfig } from "../sim/engine";
import { queueDepth } from "../sim/engine";
import type { SimEngineState } from "../sim/engine";
import {
  rollingFailureRate,
  scoreFailedRoute,
  scoreSuccessfulRoute,
  streakMultiplier,
} from "../sim/metrics";
import type { BackendPool, IncomingRequest, ListenerPort } from "../sim/types";

export const ARCADE_QUEUE_GAME_OVER = 15;
export const ARCADE_FAILURE_WINDOW_TICKS = 15;
export const ARCADE_FAILURE_RATE_THRESHOLD = 0.25;
export const ARCADE_RECOVERY_TICKS = 15;
export const ARCADE_SPAWN_RAMP_INTERVAL = 30;
export const ARCADE_MAX_SPAWN_PER_TICK = 5;

export interface ArcadeScoreState {
  score: number;
  streak: number;
  recentOutcomes: number[];
}

export interface ArcadeGameOverResult {
  score: number;
  activeTrafficMs: number;
  reason: "queue" | "error_rate";
}

const ARCADE_TEMPLATES = [
  {
    host: "api.example",
    path: "/v1/users",
    method: "GET" as const,
    listenerPort: 80 as ListenerPort,
  },
  {
    host: "app.example",
    path: "/static/app.js",
    method: "GET" as const,
    listenerPort: 80 as ListenerPort,
  },
  {
    host: "app.example",
    path: "/",
    method: "GET" as const,
    listenerPort: 80 as ListenerPort,
  },
  {
    host: "api.example",
    path: "/v1/health",
    method: "GET" as const,
    listenerPort: 80 as ListenerPort,
  },
];

export function createArcadeScoreState(): ArcadeScoreState {
  return { score: 0, streak: 0, recentOutcomes: [] };
}

export function spawnRateForTick(activeTrafficTicks: number): number {
  const ramp = Math.floor(activeTrafficTicks / ARCADE_SPAWN_RAMP_INTERVAL);
  return Math.min(ARCADE_MAX_SPAWN_PER_TICK, 1 + ramp);
}

export function failureInjectionInterval(spawnRate: number): number {
  return Math.max(6, Math.floor(30 / spawnRate));
}

export function shouldInjectBackendFailure(activeTrafficTicks: number, spawnRate: number): boolean {
  if (activeTrafficTicks <= 0) {
    return false;
  }
  return activeTrafficTicks % failureInjectionInterval(spawnRate) === 0;
}

export function buildArcadeSimConfig(rngSeed = 42): SimEngineConfig {
  const pools: Record<string, BackendPool> = {
    web: {
      id: "web",
      name: "Web Pool",
      stickyEnabled: false,
      backends: [
        { id: "web-a", name: "web-a", weight: 50, health: "healthy" },
        { id: "web-b", name: "web-b", weight: 50, health: "healthy" },
      ],
    },
    api: {
      id: "api",
      name: "API Pool",
      stickyEnabled: false,
      backends: [{ id: "api-1", name: "api-1", weight: 100, health: "healthy" }],
    },
    static: {
      id: "static",
      name: "Static Pool",
      stickyEnabled: false,
      backends: [{ id: "static-1", name: "static-1", weight: 100, health: "healthy" }],
    },
  };

  return {
    pools,
    listenerRules: {
      80: {
        listenerPort: 80,
        playerRules: [
          {
            id: "arcade-api-host",
            priority: 10,
            matchType: "host",
            matchValue: "api.example",
            targetPoolId: "api",
          },
          {
            id: "arcade-static-path",
            priority: 20,
            matchType: "path_prefix",
            matchValue: "/static",
            targetPoolId: "static",
          },
        ],
        defaultRule: { priority: 100, action: "route", targetPoolId: "web" },
      },
      443: {
        listenerPort: 443,
        playerRules: [],
        defaultRule: { priority: 100, action: "deny" },
      },
    },
    rngSeed,
  };
}

export function spawnArcadeRequests(
  activeTrafficTicks: number,
  sequence: number,
): IncomingRequest[] {
  const count = spawnRateForTick(activeTrafficTicks);
  const spawned: IncomingRequest[] = [];

  for (let index = 0; index < count; index++) {
    const template = ARCADE_TEMPLATES[(activeTrafficTicks + index) % ARCADE_TEMPLATES.length]!;
    spawned.push({
      id: `arc-${activeTrafficTicks}-${sequence}-${index}`,
      listenerPort: template.listenerPort,
      host: template.host,
      path: template.path,
      method: template.method,
      headers: {},
    });
  }

  return spawned;
}

export function listHealthyBackendIds(pools: Record<string, BackendPool>): string[] {
  return Object.values(pools).flatMap((pool) =>
    pool.backends.filter((backend) => backend.health === "healthy").map((backend) => backend.id),
  );
}

export function pickRandomHealthyBackend(
  pools: Record<string, BackendPool>,
  rng: () => number,
): string | null {
  const healthy = listHealthyBackendIds(pools);
  if (healthy.length === 0) {
    return null;
  }
  return healthy[Math.floor(rng() * healthy.length)] ?? null;
}

export function applyRouteToScore(state: ArcadeScoreState, outcome: number): ArcadeScoreState {
  const recentOutcomes = [...state.recentOutcomes, outcome].slice(-ARCADE_FAILURE_WINDOW_TICKS);

  if (outcome === 200) {
    const streakAfter = state.streak + 1;
    return {
      score: scoreSuccessfulRoute(state.score, streakAfter),
      streak: streakAfter,
      recentOutcomes,
    };
  }

  return {
    score: scoreFailedRoute(state.score),
    streak: 0,
    recentOutcomes,
  };
}

export function arcadeGameOverReason(
  engine: SimEngineState,
  recentOutcomes: number[],
): ArcadeGameOverResult["reason"] | null {
  if (queueDepth(engine) >= ARCADE_QUEUE_GAME_OVER) {
    return "queue";
  }

  if (recentOutcomes.length >= ARCADE_FAILURE_WINDOW_TICKS) {
    const failureRate = rollingFailureRate(recentOutcomes, ARCADE_FAILURE_WINDOW_TICKS);
    if (failureRate > ARCADE_FAILURE_RATE_THRESHOLD) {
      return "error_rate";
    }
  }

  return null;
}

export function buildGameOverResult(
  score: number,
  activeTrafficTicks: number,
  reason: ArcadeGameOverResult["reason"],
): ArcadeGameOverResult {
  return {
    score,
    activeTrafficMs: activeTrafficTicks * 1000,
    reason,
  };
}

export function currentStreakMultiplier(streak: number): number {
  return streakMultiplier(streak);
}

export function normalizeInitials(raw: string): string {
  let letters = "";
  for (const char of raw.toUpperCase()) {
    if (char >= "A" && char <= "Z") {
      letters += char;
    }
  }

  while (letters.length < 3) {
    letters += "A";
  }

  return letters.slice(0, 3);
}
