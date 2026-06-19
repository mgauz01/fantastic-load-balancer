import { describe, expect, it } from "vitest";
import {
  MAX_DECOR_PACKETS,
  advanceDecorTraffic,
  createDecorTrafficState,
  tickDecorTraffic,
} from "./trafficDecor";

describe("trafficDecor", () => {
  it("initializes at most MAX_DECOR_PACKETS packets", () => {
    const state = createDecorTrafficState();
    expect(state.packets.length).toBeLessThanOrEqual(MAX_DECOR_PACKETS);
    expect(state.packets.length).toBeGreaterThan(0);
    expect(state.backends.length).toBeGreaterThanOrEqual(3);
  });

  it("advances packet progress over ticks", () => {
    const before = createDecorTrafficState();
    const firstProgress = before.packets[0]?.progress ?? 0;

    const after = tickDecorTraffic(before, 100);
    const nextProgress = after.packets[0]?.progress ?? 0;

    expect(nextProgress).toBeGreaterThan(firstProgress);
  });

  it("does not advance when frozen (reduced motion)", () => {
    const state = createDecorTrafficState();
    const frozen = advanceDecorTraffic(state, 100, { frozen: true });
    expect(frozen.packets).toEqual(state.packets);
  });

  it("does not advance when paused (hidden document)", () => {
    const state = createDecorTrafficState();
    const paused = advanceDecorTraffic(state, 100, { paused: true });
    expect(paused.packets).toEqual(state.packets);
  });
});
