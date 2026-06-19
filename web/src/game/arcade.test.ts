import { describe, expect, it } from "vitest";
import { createSimEngine, enqueueRequests, tick } from "../sim/engine";
import {
  applyRouteToScore,
  arcadeGameOverReason,
  createArcadeScoreState,
  failureInjectionInterval,
  normalizeInitials,
  pickRandomHealthyBackend,
  shouldInjectBackendFailure,
  spawnArcadeRequests,
  spawnRateForTick,
  buildArcadeSimConfig,
} from "./arcade";
import { createSeededRandom } from "../sim/rng";

describe("arcade", () => {
  it("ramps spawn rate every 30 active ticks up to 5", () => {
    expect(spawnRateForTick(0)).toBe(1);
    expect(spawnRateForTick(29)).toBe(1);
    expect(spawnRateForTick(30)).toBe(2);
    expect(spawnRateForTick(120)).toBe(5);
    expect(spawnRateForTick(300)).toBe(5);
  });

  it("scales backend failure interval with spawn rate", () => {
    expect(failureInjectionInterval(1)).toBe(30);
    expect(failureInjectionInterval(5)).toBe(6);
    expect(shouldInjectBackendFailure(30, 1)).toBe(true);
    expect(shouldInjectBackendFailure(31, 1)).toBe(false);
  });

  it("applies streak scoring and resets on failures", () => {
    let score = createArcadeScoreState();

    for (let index = 0; index < 10; index++) {
      score = applyRouteToScore(score, 200);
    }
    expect(score.streak).toBe(10);
    expect(score.score).toBe(110);

    score = applyRouteToScore(score, 502);
    expect(score.streak).toBe(0);
    expect(score.score).toBe(105);
  });

  it("ends the run on queue overflow or sustained error rate", () => {
    const engine = createSimEngine(buildArcadeSimConfig());
    const queued = enqueueRequests(
      { ...engine, phase: "running" },
      Array.from({ length: 15 }, (_, index) => ({
        id: `q-${index}`,
        listenerPort: 80,
        host: "app.example",
        path: "/",
        method: "GET",
        headers: {},
      })),
    );
    expect(arcadeGameOverReason(queued, [])).toBe("queue");

    const outcomes = Array.from({ length: 15 }, () => 502);
    expect(arcadeGameOverReason(engine, outcomes)).toBe("error_rate");
    const borderline = Array.from({ length: 15 }, (_, index) => (index < 3 ? 502 : 200));
    expect(arcadeGameOverReason(engine, borderline)).toBeNull();
  });

  it("spawns deterministic request batches from templates", () => {
    const first = spawnArcadeRequests(0, 0);
    const second = spawnArcadeRequests(0, 1);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]?.host).toBe("api.example");
  });

  it("picks a healthy backend with seeded RNG", () => {
    const config = buildArcadeSimConfig(7);
    const engine = createSimEngine(config);
    const rng = createSeededRandom(7);
    const backendId = pickRandomHealthyBackend(engine.pools, rng);
    expect(backendId).toBeTruthy();
  });

  it("normalizes initials to three uppercase letters", () => {
    expect(normalizeInitials("m")).toBe("MAA");
    expect(normalizeInitials("arcade")).toBe("ARC");
  });

  it("produces deterministic score for a fixed outcome sequence", () => {
    const outcomes = Array.from({ length: 12 }, () => 200);
    let score = createArcadeScoreState();
    for (const outcome of outcomes) {
      score = applyRouteToScore(score, outcome);
    }
    expect(score.score).toBe(150);
  });

  it("routes arcade traffic through the sim engine", () => {
    let engine = createSimEngine(buildArcadeSimConfig(99));
    engine = { ...engine, phase: "running" };
    engine = tick(engine, { incoming: spawnArcadeRequests(1, 0) });
    expect(engine.log.length).toBeGreaterThan(0);
    expect(engine.log[0]?.outcome).toBe(200);
  });
});
