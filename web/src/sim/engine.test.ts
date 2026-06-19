import { describe, expect, it } from "vitest";
import {
  createSimEngine,
  enqueueRequests,
  queueDepth,
  setPhase,
  tick,
} from "./engine";
import type { IncomingRequest, ListenerRules } from "./types";

const listenerRules: Record<80 | 443, ListenerRules> = {
  80: {
    listenerPort: 80,
    playerRules: [],
    defaultRule: { priority: 100, action: "route", targetPoolId: "web" },
  },
  443: {
    listenerPort: 443,
    playerRules: [],
    defaultRule: { priority: 100, action: "route", targetPoolId: "web" },
  },
};

function makeRequest(id: string): IncomingRequest {
  return {
    id,
    listenerPort: 80,
    host: "app.example",
    path: "/",
    method: "GET",
    headers: {},
  };
}

describe("SimEngine", () => {
  it("routes at most one queued request per tick", () => {
    let state = createSimEngine({
      pools: {
        web: {
          id: "web",
          name: "web",
          stickyEnabled: false,
          backends: [{ id: "b1", name: "b1", weight: 100, health: "healthy" }],
        },
      },
      listenerRules,
      rngSeed: 11,
    });

    state = setPhase(state, "running");
    state = enqueueRequests(state, [makeRequest("r1"), makeRequest("r2")]);
    expect(queueDepth(state)).toBe(2);

    state = tick(state);
    expect(queueDepth(state)).toBe(1);
    expect(state.metrics.totalRouted).toBe(1);
    expect(state.log).toHaveLength(1);

    state = tick(state);
    expect(queueDepth(state)).toBe(0);
    expect(state.metrics.totalRouted).toBe(2);
  });

  it("does not advance routing while paused in configure phase", () => {
    let state = createSimEngine({
      pools: {
        web: {
          id: "web",
          name: "web",
          stickyEnabled: false,
          backends: [{ id: "b1", name: "b1", weight: 100, health: "healthy" }],
        },
      },
      listenerRules,
    });

    state = setPhase(state, "running");
    state = enqueueRequests(state, [makeRequest("r1")]);
    state = setPhase(state, "configure");
    state = tick(state);

    expect(state.metrics.totalRouted).toBe(0);
    expect(queueDepth(state)).toBe(1);
  });

  it("keeps only the last twenty log entries", () => {
    let state = createSimEngine({
      pools: {
        web: {
          id: "web",
          name: "web",
          stickyEnabled: false,
          backends: [{ id: "b1", name: "b1", weight: 100, health: "healthy" }],
        },
      },
      listenerRules,
    });
    state = setPhase(state, "running");

    for (let i = 0; i < 25; i++) {
      state = tick(state, { incoming: [makeRequest(`r-${i}`)] });
    }

    expect(state.log).toHaveLength(20);
    expect(state.log[0]?.id).toBe("r-5");
  });
});
