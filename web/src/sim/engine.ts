import { routeRequest, toLogEntry } from "./router";
import { createSeededRandom } from "./rng";
import { cloneStickyBindings } from "./sticky";
import type {
  BackendPool,
  IncomingRequest,
  ListenerPort,
  ListenerRules,
  PoolRotationState,
  RequestLogEntry,
  SimPhase,
  StickyBindings,
} from "./types";
import { createMetricsSnapshot, recordRouteOutcome, type MetricsSnapshot } from "./metrics";

export const MAX_LOG_ENTRIES = 20;

export interface SimEngineConfig {
  pools: Record<string, BackendPool>;
  listenerRules: Record<ListenerPort, ListenerRules>;
  rngSeed?: number;
}

export interface SimEngineState {
  phase: SimPhase;
  activeTrafficTicks: number;
  queue: IncomingRequest[];
  log: RequestLogEntry[];
  pools: Record<string, BackendPool>;
  listenerRules: Record<ListenerPort, ListenerRules>;
  rotationState: PoolRotationState;
  stickyBindings: StickyBindings;
  metrics: MetricsSnapshot;
  rngSeed: number;
  healthRecoveryTimers: Record<string, number>;
}

export function createSimEngine(config: SimEngineConfig): SimEngineState {
  return {
    phase: "configure",
    activeTrafficTicks: 0,
    queue: [],
    log: [],
    pools: structuredClonePools(config.pools),
    listenerRules: structuredClone(config.listenerRules),
    rotationState: {},
    stickyBindings: {},
    metrics: createMetricsSnapshot(),
    rngSeed: config.rngSeed ?? 1,
    healthRecoveryTimers: {},
  };
}

export function setPhase(state: SimEngineState, phase: SimPhase): SimEngineState {
  return { ...state, phase };
}

export function enqueueRequests(
  state: SimEngineState,
  requests: IncomingRequest[],
): SimEngineState {
  if (state.phase !== "running") {
    return state;
  }
  return { ...state, queue: [...state.queue, ...requests] };
}

export interface TickOptions {
  incoming?: IncomingRequest[];
  recoveryTicks?: Record<string, number>;
}

export function tick(state: SimEngineState, options: TickOptions = {}): SimEngineState {
  if (state.phase !== "running") {
    return state;
  }

  let next: SimEngineState = {
    ...state,
    activeTrafficTicks: state.activeTrafficTicks + 1,
    queue: options.incoming ? [...state.queue, ...options.incoming] : [...state.queue],
    pools: structuredClonePools(state.pools),
    stickyBindings: cloneStickyBindings(state.stickyBindings),
    rotationState: { ...state.rotationState },
    healthRecoveryTimers: { ...state.healthRecoveryTimers },
  };

  next = applyRecoveryTimers(next, options.recoveryTicks);

  if (next.queue.length === 0) {
    return next;
  }

  const [current, ...rest] = next.queue;
  if (!current) {
    return next;
  }

  const listenerRules = next.listenerRules[current.listenerPort];
  if (!listenerRules) {
    return { ...next, queue: rest };
  }

  const rng = createSeededRandom(next.rngSeed + next.activeTrafficTicks);
  const result = routeRequest(current, {
    pools: next.pools,
    listenerRules,
    rotationState: next.rotationState,
    stickyBindings: next.stickyBindings,
    rng,
  });

  const logEntry = toLogEntry(current, result, next.pools);
  const log = [...next.log, logEntry].slice(-MAX_LOG_ENTRIES);

  return {
    ...next,
    queue: rest,
    log,
    metrics: recordRouteOutcome(next.metrics, result.outcome),
    rngSeed: next.rngSeed,
  };
}

function applyRecoveryTimers(
  state: SimEngineState,
  recoveryTicks?: Record<string, number>,
): SimEngineState {
  const timers = { ...state.healthRecoveryTimers };

  for (const [backendId, remaining] of Object.entries(timers)) {
    if (remaining <= 1) {
      delete timers[backendId];
      state = setBackendHealth(state, backendId, "healthy");
    } else {
      timers[backendId] = remaining - 1;
    }
  }

  if (recoveryTicks) {
    for (const [backendId, ticks] of Object.entries(recoveryTicks)) {
      timers[backendId] = ticks;
    }
  }

  return { ...state, healthRecoveryTimers: timers };
}

export function setBackendHealth(
  state: SimEngineState,
  backendId: string,
  health: "healthy" | "unhealthy",
): SimEngineState {
  const pools = structuredClonePools(state.pools);
  for (const pool of Object.values(pools)) {
    for (const backend of pool.backends) {
      if (backend.id === backendId) {
        backend.health = health;
      }
    }
  }
  return { ...state, pools };
}

function structuredClonePools(
  pools: Record<string, BackendPool>,
): Record<string, BackendPool> {
  return structuredClone(pools);
}

export function queueDepth(state: SimEngineState): number {
  return state.queue.length;
}
