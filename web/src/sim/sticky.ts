import type { Backend, BackendPool, PoolRotationState, StickyBindings } from "./types";

export function getHealthyBackends(pool: BackendPool): Backend[] {
  return pool.backends.filter((backend) => backend.health === "healthy");
}

export function selectBackendFromPool(
  pool: BackendPool,
  rotationState: PoolRotationState,
  stickyBindings: StickyBindings,
  sessionCookie: string | undefined,
  rng: () => number,
): Backend | null {
  const healthy = getHealthyBackends(pool);
  if (healthy.length === 0) {
    return null;
  }

  if (pool.stickyEnabled && sessionCookie) {
    const binding = stickyBindings[sessionCookie];
    if (binding && binding.poolId === pool.id) {
      const bound = healthy.find((backend) => backend.id === binding.backendId);
      if (bound) {
        return bound;
      }
    }

    const selected = pickBackend(pool, healthy, rotationState, rng);
    stickyBindings[sessionCookie] = { poolId: pool.id, backendId: selected.id };
    return selected;
  }

  return pickBackend(pool, healthy, rotationState, rng);
}

function pickBackend(
  pool: BackendPool,
  healthy: Backend[],
  rotationState: PoolRotationState,
  rng: () => number,
): Backend {
  const weights = healthy.map((backend) => backend.weight);
  const allEqual = weights.every((weight) => weight === weights[0]);

  if (allEqual) {
    const cursor = rotationState[pool.id] ?? 0;
    const backend = healthy[cursor % healthy.length]!;
    rotationState[pool.id] = (cursor + 1) % healthy.length;
    return backend;
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * totalWeight;
  for (const backend of healthy) {
    roll -= backend.weight;
    if (roll < 0) {
      return backend;
    }
  }

  return healthy[healthy.length - 1]!;
}

export function cloneStickyBindings(bindings: StickyBindings): StickyBindings {
  return { ...bindings };
}
