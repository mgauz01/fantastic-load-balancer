import { describe, expect, it } from "vitest";
import { getCampaignLevel } from "./campaign";
import {
  applyCampaignHealthForTick,
  buildSimConfig,
  spawnRequestsForTick,
} from "./levelSim";
import type { CampaignLevel } from "./types";
import { createSimEngine, setPhase, tick, type SimEngineState } from "../sim/engine";

function backendHealth(state: SimEngineState, backendId: string): string | undefined {
  for (const pool of Object.values(state.pools)) {
    const backend = pool.backends.find((entry) => entry.id === backendId);
    if (backend) {
      return backend.health;
    }
  }
  return undefined;
}

function advanceCampaignTick(
  state: SimEngineState,
  level: CampaignLevel,
  tickNumber: number,
  sequence: { value: number },
): SimEngineState {
  const { state: afterHealth, recoveryTicks } = applyCampaignHealthForTick(
    state,
    level,
    tickNumber,
  );
  const incoming = spawnRequestsForTick(level, tickNumber, sequence.value++);
  return tick(afterHealth, { incoming, recoveryTicks });
}

const recoveryFixture: CampaignLevel = {
  id: "test_recovery",
  index: 99,
  title: "Recovery test",
  briefMarkdown: "",
  pools: [
    {
      id: "primary",
      name: "Primary",
      stickyEnabled: false,
      backends: [
        { id: "backend-a", name: "backend-a", weight: 50 },
        { id: "backend-b", name: "backend-b", weight: 50 },
      ],
    },
  ],
  listeners: {
    80: {
      defaultRule: { priority: 100, action: "route", targetPoolId: "primary" },
      starterRules: [],
    },
  },
  autoRecovery: true,
  recoveryTicks: 3,
  displayHeaders: [],
  passThreshold: { successRate: 0.9, durationTicks: 10 },
  trafficSpawns: [],
  healthEvents: [{ tick: 1, backendId: "backend-a", health: "unhealthy" }],
};

describe("applyCampaignHealthForTick", () => {
  it("schedules recovery when autoRecovery is enabled", () => {
    let state = createSimEngine(buildSimConfig(recoveryFixture));
    state = setPhase(state, "running");

    const step = applyCampaignHealthForTick(state, recoveryFixture, 1);

    expect(backendHealth(step.state, "backend-a")).toBe("unhealthy");
    expect(step.recoveryTicks).toEqual({ "backend-a": 3 });
  });

  it("does not schedule recovery when autoRecovery is disabled", () => {
    const level = getCampaignLevel("level_04")!;
    let state = createSimEngine(buildSimConfig(level));
    state = setPhase(state, "running");

    const step = applyCampaignHealthForTick(state, level, 18);

    expect(backendHealth(step.state, "primary-a")).toBe("unhealthy");
    expect(step.recoveryTicks).toEqual({});
  });
});

describe("campaign health auto-recovery", () => {
  it("restores backends after recoveryTicks active traffic ticks", () => {
    let state = createSimEngine(buildSimConfig(recoveryFixture));
    state = setPhase(state, "running");
    const sequence = { value: 0 };

    for (let tickNumber = 1; tickNumber <= 4; tickNumber++) {
      state = advanceCampaignTick(state, recoveryFixture, tickNumber, sequence);
    }

    expect(backendHealth(state, "backend-a")).toBe("healthy");
  });

  it("leaves failed backends unhealthy when autoRecovery is disabled", () => {
    const level = getCampaignLevel("level_04")!;
    let state = createSimEngine(buildSimConfig(level));
    state = setPhase(state, "running");
    const sequence = { value: 0 };

    for (let tickNumber = 1; tickNumber <= 40; tickNumber++) {
      state = advanceCampaignTick(state, level, tickNumber, sequence);
    }

    expect(backendHealth(state, "primary-a")).toBe("unhealthy");
  });
});
