import { describe, expect, it } from "vitest";
import { createMetricsSnapshot, recordRouteOutcome } from "../sim/metrics";
import { createPlayerRuleId, resetPlayerRuleIdCounter } from "../sim/ruleEditor";
import { getCampaignLevel, levelIDForIndex, listCampaignLevels } from "./campaign";
import { buildSimConfig } from "./levelSim";
import {
  canPassWithoutWaiting,
  evaluateAttempt,
  validateCapstoneMistakes,
} from "./evaluator";
import { createSimEngine, setPhase, tick } from "../sim/engine";

describe("campaign levels", () => {
  it("loads eight ordered campaign levels", () => {
    const levels = listCampaignLevels();
    expect(levels).toHaveLength(8);
    expect(levels[0]?.id).toBe("level_01");
    expect(levels[7]?.id).toBe("level_08");
    expect(levelIDForIndex(3)).toBe("level_03");
  });

  it("level 1 uses default route with 90 percent over 45 ticks", () => {
    const level = getCampaignLevel("level_01");
    expect(level).not.toBeNull();
    expect(level!.listeners[80]?.defaultRule.action).toBe("route");
    expect(level!.passThreshold).toEqual({ successRate: 0.9, durationTicks: 45 });
  });

  it("level 2 denies by default and coaches a host rule", () => {
    const level = getCampaignLevel("level_02");
    expect(level!.listeners[80]?.defaultRule.action).toBe("deny");
    expect(level!.playHint).toMatch(/metrics\.example/i);
    expect(level!.ruleCoach).toEqual({
      priority: 10,
      matchType: "host",
      matchValue: "metrics.example",
      targetPoolId: "split",
    });
  });

  it("level 3 defaults to deny on :80", () => {
    const level = getCampaignLevel("level_03");
    expect(level!.listeners[80]?.defaultRule.action).toBe("deny");
    expect(level!.passThreshold.successRate).toBe(0.95);
  });

  it("level 4 disables auto recovery", () => {
    const level = getCampaignLevel("level_04");
    expect(level!.autoRecovery).toBe(false);
    expect(level!.healthEvents.length).toBeGreaterThan(0);
  });

  it("level 8 documents five capstone mistake categories", () => {
    const level = getCampaignLevel("level_08");
    expect(validateCapstoneMistakes(level!)).toEqual([]);
    expect(level!.capstoneMistakes).toHaveLength(5);
  });
});

describe("campaign evaluator", () => {
  it("passes level 1 when duration and success rate are met", () => {
    const level = getCampaignLevel("level_01")!;
    let metrics = createMetricsSnapshot();
    for (let i = 0; i < 45; i++) {
      metrics = recordRouteOutcome(metrics, 200);
    }

    expect(
      evaluateAttempt(level, {
        activeTrafficTicks: 45,
        metrics,
        estimatedRemainingRequests: 0,
      }),
    ).toBe("passed");
  });

  it("does not allow early pass before duration elapses", () => {
    const level = getCampaignLevel("level_01")!;
    let metrics = createMetricsSnapshot();
    for (let i = 0; i < 10; i++) {
      metrics = recordRouteOutcome(metrics, 200);
    }

    const state = {
      activeTrafficTicks: 10,
      metrics,
      estimatedRemainingRequests: 35,
    };

    expect(evaluateAttempt(level, state)).toBe("running");
    expect(canPassWithoutWaiting(level, state)).toBe(true);
  });

  it("fails early when success rate is mathematically unwinnable", () => {
    const level = getCampaignLevel("level_03")!;
    let metrics = createMetricsSnapshot();
    for (let i = 0; i < 20; i++) {
      metrics = recordRouteOutcome(metrics, 503);
    }

    expect(
      evaluateAttempt(level, {
        activeTrafficTicks: 20,
        metrics,
        estimatedRemainingRequests: 40,
      }),
    ).toBe("failed_early");
  });

  it("fails at duration when rate is below threshold", () => {
    const level = getCampaignLevel("level_03")!;
    let metrics = createMetricsSnapshot();
    for (let i = 0; i < 30; i++) {
      metrics = recordRouteOutcome(metrics, 200);
    }
    for (let i = 0; i < 30; i++) {
      metrics = recordRouteOutcome(metrics, 503);
    }

    expect(
      evaluateAttempt(level, {
        activeTrafficTicks: 60,
        metrics,
        estimatedRemainingRequests: 0,
      }),
    ).toBe("failed_time");
  });

  it("level 2 denies traffic until a coached host rule is added", () => {
    resetPlayerRuleIdCounter();
    const level = getCampaignLevel("level_02")!;
    let state = createSimEngine(buildSimConfig(level));
    state = setPhase(state, "running");

    state = tick(state, {
      incoming: [
        {
          id: "req-1",
          listenerPort: 80,
          host: "metrics.example",
          path: "/report",
          method: "GET",
          headers: {},
        },
      ],
    });

    expect(state.log[0]?.outcome).toBe(503);

    state = {
      ...state,
      listenerRules: {
        ...state.listenerRules,
        80: {
          ...state.listenerRules[80]!,
          playerRules: [
            {
              id: createPlayerRuleId(),
              priority: 10,
              matchType: "host",
              matchValue: "metrics.example",
              targetPoolId: "split",
            },
          ],
        },
      },
    };

    state = tick(state, {
      incoming: [
        {
          id: "req-2",
          listenerPort: 80,
          host: "metrics.example",
          path: "/report",
          method: "GET",
          headers: {},
        },
      ],
    });

    expect(state.log.at(-1)?.outcome).toBe(200);
  });
});
