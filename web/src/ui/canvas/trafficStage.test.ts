import { describe, expect, it } from "vitest";
import type { RequestLogEntry } from "../../sim/types";
import {
  MAX_INTRO_PACKETS,
  buildStageLayout,
  createIntroTrafficState,
  createStageTrafficState,
  enqueueStageRequest,
  tickIntroTraffic,
  tickStageTraffic,
} from "./trafficStage";

const samplePools = {
  primary: {
    id: "primary",
    name: "Primary",
    stickyEnabled: false,
    backends: [
      { id: "a", name: "a", weight: 50, health: "healthy" as const },
      { id: "b", name: "b", weight: 50, health: "unhealthy" as const },
    ],
  },
};

const successEntry: RequestLogEntry = {
  id: "req-1",
  outcome: 200,
  listenerPort: 80,
  method: "GET",
  host: "app.example",
  path: "/",
  poolId: "primary",
  poolName: "Primary",
  backendId: "a",
  backendName: "a",
  tlsTerminated: false,
};

const deniedEntry: RequestLogEntry = {
  ...successEntry,
  id: "req-2",
  outcome: 503,
  backendId: null,
  backendName: null,
};

describe("intro traffic", () => {
  it("initializes at most MAX_INTRO_PACKETS packets", () => {
    const state = createIntroTrafficState();
    expect(state.packets.length).toBeLessThanOrEqual(MAX_INTRO_PACKETS);
    expect(state.packets.length).toBeGreaterThan(0);
    expect(state.backends.length).toBeGreaterThanOrEqual(3);
  });

  it("advances packet progress over ticks", () => {
    const before = createIntroTrafficState();
    const firstProgress = before.packets[0]?.progress ?? 0;
    const after = tickIntroTraffic(before);
    expect(after.packets[0]?.progress ?? 0).toBeGreaterThan(firstProgress);
  });

  it("does not advance when frozen (reduced motion)", () => {
    const state = createIntroTrafficState();
    const frozen = tickIntroTraffic(state, { frozen: true });
    expect(frozen.packets).toEqual(state.packets);
  });

  it("does not advance when paused", () => {
    const state = createIntroTrafficState();
    const paused = tickIntroTraffic(state, { paused: true });
    expect(paused.packets).toEqual(state.packets);
  });
});

describe("trafficStage", () => {
  it("positions backends vertically from pool layout", () => {
    const layout = buildStageLayout(samplePools);
    expect(layout.backends).toHaveLength(2);
    expect(layout.backends[0]?.y).toBeLessThan(layout.backends[1]?.y ?? 0);
  });

  it("advances ambient packet progress while running", () => {
    const layout = buildStageLayout(samplePools);
    const before = createStageTrafficState(layout);
    const after = tickStageTraffic(before, 100, layout);

    expect(after.ambient[0]?.progress).toBeGreaterThan(before.ambient[0]?.progress ?? 0);
  });

  it("does not advance when paused", () => {
    const layout = buildStageLayout(samplePools);
    const state = createStageTrafficState(layout);
    const paused = tickStageTraffic(state, 100, layout, { paused: true });
    expect(paused).toEqual(state);
  });

  it("queues routed request animations from log entries", () => {
    const layout = buildStageLayout(samplePools);
    const state = enqueueStageRequest(createStageTrafficState(layout), successEntry, layout);
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]?.entryId).toBe("req-1");
  });

  it("flashes the balancer when a request is denied at the edge", () => {
    const layout = buildStageLayout(samplePools);
    let state = enqueueStageRequest(createStageTrafficState(layout), deniedEntry, layout);
    let sawBalancerFlash = false;

    for (let step = 0; step < 35; step++) {
      state = tickStageTraffic(state, 100, layout);
      if (state.balancerFlash) {
        sawBalancerFlash = true;
      }
    }

    expect(state.requests).toHaveLength(0);
    expect(sawBalancerFlash).toBe(true);
  });

  it("flashes the target backend after a successful route animation", () => {
    const layout = buildStageLayout(samplePools);
    let state = enqueueStageRequest(createStageTrafficState(layout), successEntry, layout);
    let sawBackendFlash = false;

    for (let step = 0; step < 70; step++) {
      state = tickStageTraffic(state, 100, layout);
      if (state.flashes.some((flash) => flash.backendId === "a")) {
        sawBackendFlash = true;
      }
    }

    expect(state.requests).toHaveLength(0);
    expect(sawBackendFlash).toBe(true);
  });
});
