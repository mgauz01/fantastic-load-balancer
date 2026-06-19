import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCampaignLevel } from "../game/campaign";
import { useSimSession } from "./useSimSession";

describe("useSimSession", () => {
  it("starts in configure phase with level rules loaded", () => {
    const level = getCampaignLevel("level_01");
    expect(level).not.toBeNull();

    const { result } = renderHook(() => useSimSession(level!));

    expect(result.current.isPaused).toBe(true);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.state.listenerRules[80]).toBeDefined();
    expect(result.current.successRate).toBe(1);
  });

  it("pauses and resumes the simulation loop", () => {
    const level = getCampaignLevel("level_01");
    expect(level).not.toBeNull();

    const { result } = renderHook(() => useSimSession(level!));

    act(() => {
      result.current.resume();
    });
    expect(result.current.isRunning).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.retry();
    });
    expect(result.current.state.activeTrafficTicks).toBe(0);
  });
});
