import type { CampaignLevel } from "./types";
import type { IncomingRequest, ListenerPort } from "../sim/types";
import type { SimEngineConfig } from "../sim/engine";
import { poolsToSimRecord } from "./campaign";

export function buildSimConfig(level: CampaignLevel, rngSeed = 42): SimEngineConfig {
  const listenerRules: Partial<Record<ListenerPort, SimEngineConfig["listenerRules"][ListenerPort]>> =
    {};

  for (const port of [80, 443] as ListenerPort[]) {
    const config = level.listeners[port];
    if (!config) continue;
    listenerRules[port] = {
      listenerPort: port,
      playerRules: config.starterRules.map((rule) => ({ ...rule })),
      defaultRule: { ...config.defaultRule },
    };
  }

  return {
    pools: poolsToSimRecord(level),
    listenerRules: listenerRules as SimEngineConfig["listenerRules"],
    rngSeed,
  };
}

export function spawnRequestsForTick(
  level: CampaignLevel,
  tick: number,
  sequence: number,
): IncomingRequest[] {
  const spawned: IncomingRequest[] = [];

  for (const spawn of level.trafficSpawns) {
    if (tick <= 0 || tick % spawn.everyTicks !== 0) {
      continue;
    }

    for (let index = 0; index < spawn.count; index++) {
      spawned.push({
        id: `req-${tick}-${sequence}-${index}`,
        listenerPort: spawn.template.listenerPort,
        host: spawn.template.host,
        path: spawn.template.path,
        method: spawn.template.method,
        headers: { ...(spawn.template.headers ?? {}) },
        sessionCookie: spawn.template.sessionCookie,
      });
    }
  }

  return spawned;
}

export function healthEventsForTick(level: CampaignLevel, tick: number) {
  return level.healthEvents.filter((event) => event.tick === tick);
}
