import { describe, expect, it, beforeEach } from "vitest";
import { createSimEngine } from "./engine";
import {
  canEditRules,
  createPlayerRuleId,
  deletePlayerRule,
  draftToPlayerRule,
  nextSuggestedPriority,
  resetPlayerRuleIdCounter,
  setListenerPlayerRules,
  upsertPlayerRule,
  validateListenerPlayerRules,
  validateRuleDraft,
} from "./ruleEditor";
import type { ListenerRules } from "./types";
import type { SimEngineConfig } from "./engine";

const baseConfig: SimEngineConfig = {
  pools: {
    web: {
      id: "web",
      name: "Web Pool",
      stickyEnabled: false,
      backends: [{ id: "web-a", name: "web-a", weight: 100, health: "healthy" }],
    },
    api: {
      id: "api",
      name: "API Pool",
      stickyEnabled: false,
      backends: [{ id: "api-a", name: "api-a", weight: 100, health: "healthy" }],
    },
  },
  listenerRules: {
    80: {
      listenerPort: 80,
      playerRules: [],
      defaultRule: { priority: 100, action: "deny" },
    },
    443: {
      listenerPort: 443,
      playerRules: [],
      defaultRule: { priority: 100, action: "deny" },
    },
  },
};

describe("ruleEditor", () => {
  beforeEach(() => {
    resetPlayerRuleIdCounter();
  });

  it("validates draft fields and pool targets", () => {
    const errors = validateRuleDraft(
      {
        priority: 0,
        matchType: "host",
        matchValue: "",
        targetPoolId: "missing",
      },
      baseConfig.pools,
    );

    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects duplicate priorities when saving", () => {
    const rules: ListenerRules["playerRules"] = [
      {
        id: "existing",
        priority: 10,
        matchType: "host",
        matchValue: "app.example",
        targetPoolId: "web",
      },
    ];

    const errors = validateListenerPlayerRules(
      rules,
      {
        priority: 10,
        matchType: "path_prefix",
        matchValue: "/api",
        targetPoolId: "api",
      },
      baseConfig.pools,
    );

    expect(errors[0]?.message).toMatch(/duplicate/i);
  });

  it("adds and updates player rules while configure phase is active", () => {
    let state = createSimEngine(baseConfig);
    expect(canEditRules(state.phase)).toBe(true);

    state = upsertPlayerRule(state, 80, {
      priority: 10,
      matchType: "host",
      matchValue: "api.example",
      targetPoolId: "api",
    });

    expect(state.listenerRules[80]?.playerRules).toHaveLength(1);

    const ruleId = state.listenerRules[80]!.playerRules[0]!.id;
    state = upsertPlayerRule(state, 80, {
      id: ruleId,
      priority: 10,
      matchType: "host",
      matchValue: "api.example",
      targetPoolId: "web",
    });

    expect(state.listenerRules[80]?.playerRules[0]?.targetPoolId).toBe("web");
  });

  it("deletes player rules and blocks edits while running", () => {
    let state = createSimEngine(baseConfig);
    state = upsertPlayerRule(state, 80, {
      priority: 5,
      matchType: "path_prefix",
      matchValue: "/",
      targetPoolId: "web",
    });

    const ruleId = state.listenerRules[80]!.playerRules[0]!.id;
    state = deletePlayerRule(state, 80, ruleId);
    expect(state.listenerRules[80]?.playerRules).toHaveLength(0);

    state = { ...state, phase: "running" };
    expect(() =>
      setListenerPlayerRules(state, 80, [
        draftToPlayerRule({
          priority: 1,
          matchType: "host",
          matchValue: "x",
          targetPoolId: "web",
        }),
      ]),
    ).toThrow(/paused/i);
  });

  it("suggests the next priority above existing rules", () => {
    expect(nextSuggestedPriority([])).toBe(10);
    expect(
      nextSuggestedPriority([
        {
          id: createPlayerRuleId(),
          priority: 12,
          matchType: "host",
          matchValue: "a",
          targetPoolId: "web",
        },
      ]),
    ).toBe(13);
  });
});
