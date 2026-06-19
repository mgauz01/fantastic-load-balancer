import { describe, expect, it } from "vitest";
import {
  cumulativeSuccessRate,
  isEarlyFail,
  scoreFailedRoute,
  scoreSuccessfulRoute,
  streakMultiplier,
} from "./metrics";
import { createMetricsSnapshot, recordRouteOutcome } from "./metrics";

describe("metrics", () => {
  it("tracks cumulative success rate", () => {
    let metrics = createMetricsSnapshot();
    metrics = recordRouteOutcome(metrics, 200);
    metrics = recordRouteOutcome(metrics, 502);
    expect(cumulativeSuccessRate(metrics)).toBe(0.5);
  });

  it("detects early fail when threshold is unreachable", () => {
    let metrics = createMetricsSnapshot();
    metrics = recordRouteOutcome(metrics, 502);
    metrics = recordRouteOutcome(metrics, 502);
    expect(isEarlyFail(0.95, metrics, 10)).toBe(true);
  });

  it("applies arcade streak multipliers and penalties", () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(10)).toBe(2);
    expect(streakMultiplier(25)).toBe(3);
    expect(scoreSuccessfulRoute(100, 10)).toBe(120);
    expect(scoreFailedRoute(100)).toBe(95);
  });
});
