import { describe, expect, it } from "vitest";
import { MAX_PLAYER_RULES, validatePlayerRules } from "./rules";
import type { PlayerRule } from "./types";

function makeRule(priority: number): PlayerRule {
  return {
    id: `rule-${priority}`,
    priority,
    matchType: "path_prefix",
    matchValue: "/",
    targetPoolId: "default-pool",
  };
}

describe("validatePlayerRules", () => {
  it("rejects duplicate priorities", () => {
    const errors = validatePlayerRules([makeRule(1), makeRule(1)]);
    expect(errors.some((error) => error.code === "duplicate_priority")).toBe(true);
  });

  it("rejects more than ten player rules", () => {
    const rules = Array.from({ length: MAX_PLAYER_RULES + 1 }, (_, index) =>
      makeRule(index + 1),
    );
    const errors = validatePlayerRules(rules);
    expect(errors.some((error) => error.code === "too_many_rules")).toBe(true);
  });
});
