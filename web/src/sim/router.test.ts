import { describe, expect, it } from "vitest";
import { routeRequest, toLogEntry } from "./router";
import { createSeededRandom } from "./rng";
import type {
  BackendPool,
  IncomingRequest,
  ListenerRules,
  RouteContext,
} from "./types";

function makePool(
  id: string,
  backends: BackendPool["backends"],
  stickyEnabled = false,
): BackendPool {
  return { id, name: id, backends, stickyEnabled };
}

function makeRequest(overrides: Partial<IncomingRequest> = {}): IncomingRequest {
  return {
    id: "req-1",
    listenerPort: 80,
    host: "app.example",
    path: "/",
    method: "GET",
    headers: {},
    ...overrides,
  };
}

function makeContext(
  pools: Record<string, BackendPool>,
  listenerRules: ListenerRules,
  seed = 42,
): RouteContext {
  return {
    pools,
    listenerRules,
    rotationState: {},
    stickyBindings: {},
    rng: createSeededRandom(seed),
  };
}

describe("acceptance routing examples", () => {
  it("AE1: distributes 70/30 weighted traffic within tolerance", () => {
    const pool = makePool("weighted", [
      { id: "heavy", name: "heavy", weight: 70, health: "healthy" },
      { id: "light", name: "light", weight: 30, health: "healthy" },
    ]);

    const listenerRules: ListenerRules = {
      listenerPort: 80,
      playerRules: [],
      defaultRule: { priority: 100, action: "route", targetPoolId: "weighted" },
    };

    const counts = { heavy: 0, light: 0 };
    for (let i = 0; i < 1000; i++) {
      const context = makeContext({ weighted: pool }, listenerRules, 1000 + i);
      const result = routeRequest(makeRequest({ id: `req-${i}` }), context);
      if (result.matchedBackendId === "heavy") counts.heavy += 1;
      if (result.matchedBackendId === "light") counts.light += 1;
    }

    expect(counts.heavy).toBeGreaterThanOrEqual(600);
    expect(counts.heavy).toBeLessThanOrEqual(800);
    expect(counts.heavy + counts.light).toBe(1000);
  });

  it("AE2: returns 502 when matched pool has no healthy backend", () => {
    const pool = makePool("solo", [
      { id: "only", name: "only", weight: 100, health: "unhealthy" },
    ]);
    const listenerRules: ListenerRules = {
      listenerPort: 80,
      playerRules: [],
      defaultRule: { priority: 100, action: "route", targetPoolId: "solo" },
    };

    const result = routeRequest(
      makeRequest(),
      makeContext({ solo: pool }, listenerRules),
    );

    expect(result.outcome).toBe(502);
    expect(result.matchedPoolId).toBe("solo");
  });

  it("AE3: binds sticky session cookie to the same backend while healthy", () => {
    const pool = makePool(
      "sticky",
      [
        { id: "a", name: "a", weight: 50, health: "healthy" },
        { id: "b", name: "b", weight: 50, health: "healthy" },
      ],
      true,
    );

    const listenerRules: ListenerRules = {
      listenerPort: 80,
      playerRules: [],
      defaultRule: { priority: 100, action: "route", targetPoolId: "sticky" },
    };

    const context = makeContext({ sticky: pool }, listenerRules, 7);
    const first = routeRequest(makeRequest({ sessionCookie: "sess-abc" }), context);
    const second = routeRequest(
      makeRequest({ id: "req-2", sessionCookie: "sess-abc" }),
      context,
    );

    expect(first.outcome).toBe(200);
    expect(second.outcome).toBe(200);
    expect(second.matchedBackendId).toBe(first.matchedBackendId);
  });

  it("AE4: header rule wins over lower-priority path rule", () => {
    const euPool = makePool("eu", [
      { id: "eu-1", name: "eu-1", weight: 100, health: "healthy" },
    ]);
    const apiPool = makePool("api", [
      { id: "api-1", name: "api-1", weight: 100, health: "healthy" },
    ]);

    const listenerRules: ListenerRules = {
      listenerPort: 80,
      playerRules: [
        {
          id: "eu-header",
          priority: 1,
          matchType: "header",
          headerName: "X-Region",
          matchValue: "eu",
          targetPoolId: "eu",
        },
        {
          id: "api-path",
          priority: 2,
          matchType: "path_prefix",
          matchValue: "/api",
          targetPoolId: "api",
        },
      ],
      defaultRule: { priority: 100, action: "deny" },
    };

    const result = routeRequest(
      makeRequest({
        path: "/api/users",
        headers: { "X-Region": "eu" },
      }),
      makeContext({ eu: euPool, api: apiPool }, listenerRules),
    );

    expect(result.outcome).toBe(200);
    expect(result.matchedPoolId).toBe("eu");
    expect(result.matchedRuleId).toBe("eu-header");
  });

  it("AE5: marks :443 listener traffic as TLS-terminated in logs", () => {
    const pool = makePool("secure", [
      { id: "s1", name: "s1", weight: 100, health: "healthy" },
    ]);
    const listenerRules: ListenerRules = {
      listenerPort: 443,
      playerRules: [],
      defaultRule: { priority: 100, action: "route", targetPoolId: "secure" },
    };

    const request = makeRequest({ listenerPort: 443 });
    const result = routeRequest(
      request,
      makeContext({ secure: pool }, listenerRules),
    );
    const logEntry = toLogEntry(request, result, { secure: pool });

    expect(result.tlsTerminated).toBe(true);
    expect(logEntry.tlsTerminated).toBe(true);
    expect(logEntry.listenerPort).toBe(443);
  });

  it("returns 503 when default rule denies traffic", () => {
    const listenerRules: ListenerRules = {
      listenerPort: 80,
      playerRules: [],
      defaultRule: { priority: 100, action: "deny" },
    };

    const result = routeRequest(makeRequest(), makeContext({}, listenerRules));
    expect(result.outcome).toBe(503);
    expect(result.denied).toBe(true);
  });
});
