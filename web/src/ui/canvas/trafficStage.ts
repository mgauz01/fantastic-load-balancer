import type { BackendPool, HttpMethod, RequestLogEntry, RouteOutcome } from "../../sim/types";
import { drawClient, drawServer } from "./canvasDraw";

export const CANVAS_WIDTH = 320;
export const CANVAS_HEIGHT = 180;
export const CANVAS_TICK_MS = 100;
export const STAGE_WIDTH = CANVAS_WIDTH;
export const STAGE_HEIGHT = CANVAS_HEIGHT;
export const STAGE_TICK_MS = CANVAS_TICK_MS;
export const MAX_STAGE_PACKETS = 16;

export interface TrafficPath {
  points: Array<{ x: number; y: number }>;
}

export function getPointOnPath(path: TrafficPath, t: number): { x: number; y: number } {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = path.points.length - 1;
  const scaled = clamped * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const localT = scaled - index;
  const a = path.points[index]!;
  const b = path.points[index + 1]!;
  return {
    x: a.x + (b.x - a.x) * localT,
    y: a.y + (b.y - a.y) * localT,
  };
}

export interface StageBackend {
  id: string;
  x: number;
  y: number;
  health: "healthy" | "unhealthy";
}

export interface StageLayout {
  client: { x: number; y: number };
  balancer: { x: number; y: number };
  backends: StageBackend[];
}

export interface StageAmbientPacket {
  id: number;
  path: TrafficPath;
  progress: number;
  speed: number;
  kind: "get" | "post";
}

export interface StageRequestAnimation {
  id: number;
  entryId: string;
  segment: 0 | 1;
  path: TrafficPath;
  progress: number;
  speed: number;
  method: HttpMethod;
  outcome: RouteOutcome;
  backendId: string | null;
}

export interface StageFlash {
  backendId: string;
  color: string;
  remaining: number;
}

export interface StageTrafficState {
  nextId: number;
  ambient: StageAmbientPacket[];
  requests: StageRequestAnimation[];
  flashes: StageFlash[];
  balancerFlash: { color: string; remaining: number } | null;
}

export interface StageTickOptions {
  frozen?: boolean;
  paused?: boolean;
}

export function buildStageLayout(pools: Record<string, BackendPool>): StageLayout {
  const client = { x: 24, y: 90 };
  const balancer = { x: 160, y: 88 };
  const backends = Object.values(pools).flatMap((pool) => pool.backends);
  const count = Math.max(backends.length, 1);
  const startY = 90 - ((count - 1) * 24) / 2;

  return {
    client,
    balancer,
    backends: backends.map((backend, index) => ({
      id: backend.id,
      x: 272,
      y: Math.round(startY + index * 24),
      health: backend.health,
    })),
  };
}

function pathBetween(
  from: { x: number; y: number },
  to: { x: number; y: number },
): TrafficPath {
  return {
    points: [from, { x: (from.x + to.x) / 2, y: from.y - 10 }, to],
  };
}

export function createStageTrafficState(layout: StageLayout): StageTrafficState {
  const ambient: StageAmbientPacket[] = [];
  const targets = layout.backends.length > 0 ? layout.backends : [{ id: "fallback", x: 272, y: 90, health: "healthy" as const }];
  const count = Math.min(4, targets.length + 2);

  for (let index = 0; index < count; index++) {
    ambient.push({
      id: index,
      path: pathBetween(layout.client, layout.balancer),
      progress: (index / count) % 1,
      speed: 0.06 + (index % 3) * 0.01,
      kind: index % 2 === 0 ? "get" : "post",
    });
  }

  return {
    nextId: count,
    ambient,
    requests: [],
    flashes: [],
    balancerFlash: null,
  };
}

export function enqueueStageRequest(
  state: StageTrafficState,
  entry: RequestLogEntry,
  layout: StageLayout,
): StageTrafficState {
  const path = pathBetween(layout.client, layout.balancer);
  const requests = [
    ...state.requests,
    {
      id: state.nextId,
      entryId: entry.id,
      segment: 0 as const,
      path,
      progress: 0,
      speed: 0.32,
      method: entry.method,
      outcome: entry.outcome,
      backendId: entry.backendId,
    },
  ].slice(-MAX_STAGE_PACKETS);

  return { ...state, nextId: state.nextId + 1, requests };
}

function packetKind(method: HttpMethod): "get" | "post" {
  return method === "POST" ? "post" : "get";
}

function advanceRequestAnimations(
  state: StageTrafficState,
  layout: StageLayout,
): Pick<StageTrafficState, "requests" | "flashes" | "balancerFlash"> {
  const requests: StageRequestAnimation[] = [];
  let flashes = [...state.flashes];
  let balancerFlash = state.balancerFlash;

  for (const animation of state.requests) {
    let progress = animation.progress + animation.speed * 0.12;
    let segment = animation.segment;
    let path = animation.path;

    if (progress >= 1) {
      if (segment === 0) {
        const denied = animation.outcome !== 200 || !animation.backendId;
        if (denied) {
          balancerFlash = {
            color: animation.outcome === 200 ? "#22c55e" : "#dc2626",
            remaining: 6,
          };
          continue;
        }

        const backend = layout.backends.find((node) => node.id === animation.backendId);
        if (!backend) {
          continue;
        }

        segment = 1;
        progress = 0;
        path = pathBetween(layout.balancer, backend);
      } else {
        if (animation.backendId) {
          flashes = [
            ...flashes.filter((flash) => flash.backendId !== animation.backendId),
            {
              backendId: animation.backendId,
              color: animation.outcome === 200 ? "#22c55e" : "#dc2626",
              remaining: 8,
            },
          ];
        }
        continue;
      }
    }

    requests.push({ ...animation, segment, path, progress });
  }

  return { requests, flashes, balancerFlash };
}

function advanceAmbient(state: StageTrafficState): StageAmbientPacket[] {
  return state.ambient.map((packet) => {
    let progress = packet.progress + packet.speed * 0.12;
    if (progress >= 1) {
      progress = 0;
    }
    return { ...packet, progress };
  });
}

function decayFlashes(state: StageTrafficState): Pick<StageTrafficState, "flashes" | "balancerFlash"> {
  const flashes = state.flashes
    .map((flash) => ({ ...flash, remaining: flash.remaining - 1 }))
    .filter((flash) => flash.remaining > 0);

  const balancerFlash =
    state.balancerFlash && state.balancerFlash.remaining > 1
      ? { ...state.balancerFlash, remaining: state.balancerFlash.remaining - 1 }
      : null;

  return { flashes, balancerFlash };
}

export function tickStageTraffic(
  state: StageTrafficState,
  _deltaMs: number,
  layout: StageLayout,
  options: StageTickOptions = {},
): StageTrafficState {
  if (options.frozen || options.paused) {
    return state;
  }

  const advanced = advanceRequestAnimations(state, layout);
  const decayed = decayFlashes({ ...state, ...advanced });

  return {
    ...state,
    ambient: advanceAmbient(state),
    requests: advanced.requests,
    flashes: decayed.flashes,
    balancerFlash: decayed.balancerFlash,
  };
}

export function drawTrafficStage(
  ctx: CanvasRenderingContext2D,
  layout: StageLayout,
  state: StageTrafficState,
  scale: number,
): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

  const routeTargets =
    layout.backends.length > 0
      ? layout.backends
      : [{ id: "fallback", x: 272, y: 90, health: "healthy" as const }];

  for (const backend of routeTargets) {
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(layout.balancer.x, layout.balancer.y);
    ctx.lineTo((layout.balancer.x + backend.x) / 2, layout.balancer.y - 8);
    ctx.lineTo(backend.x - 12, backend.y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(layout.client.x + 8, layout.client.y);
  ctx.lineTo((layout.client.x + layout.balancer.x) / 2, layout.client.y - 8);
  ctx.lineTo(layout.balancer.x - 10, layout.balancer.y);
  ctx.stroke();

  drawClient(ctx, layout.client.x, layout.client.y);

  const balancerColor = state.balancerFlash?.color ?? "#1d4ed8";
  drawServer(ctx, layout.balancer.x, layout.balancer.y, balancerColor);

  for (const backend of routeTargets) {
    const flash = state.flashes.find((entry) => entry.backendId === backend.id);
    const baseColor = backend.health === "healthy" ? "#64748b" : "#7f1d1d";
    const color = flash?.color ?? baseColor;
    drawServer(ctx, backend.x, backend.y, color);
  }

  for (const packet of state.ambient) {
    const point = getPointOnPath(packet.path, packet.progress);
    ctx.fillStyle = packet.kind === "post" ? "rgba(245, 158, 11, 0.55)" : "rgba(37, 99, 235, 0.55)";
    ctx.fillRect(Math.round(point.x - 2), Math.round(point.y - 2), 4, 4);
  }

  for (const animation of state.requests) {
    const point = getPointOnPath(animation.path, animation.progress);
    const kind = packetKind(animation.method);
    ctx.fillStyle = kind === "post" ? "#f59e0b" : "#2563eb";
    ctx.fillRect(Math.round(point.x - 3), Math.round(point.y - 3), 6, 6);
  }

  ctx.restore();
}

export const MAX_INTRO_PACKETS = 12;

export interface IntroBackendNode {
  id: number;
  x: number;
  y: number;
}

export interface IntroPacket {
  id: number;
  pathIndex: number;
  progress: number;
  kind: "get" | "post";
  speed: number;
}

export interface IntroTrafficState {
  backends: IntroBackendNode[];
  paths: TrafficPath[];
  packets: IntroPacket[];
  balancer: { x: number; y: number };
}

const INTRO_BACKEND_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 48, y: 36 },
  { x: 272, y: 36 },
  { x: 48, y: 144 },
  { x: 272, y: 144 },
  { x: 160, y: 152 },
];

export function createIntroTrafficState(): IntroTrafficState {
  const balancer = { x: 160, y: 88 };
  const backends = INTRO_BACKEND_POSITIONS.map((pos, id) => ({ id, ...pos }));
  const paths = backends.map((backend) => ({
    points: [balancer, { x: (balancer.x + backend.x) / 2, y: balancer.y - 12 }, backend],
  }));

  const packets: IntroPacket[] = [];
  const count = 10;
  for (let i = 0; i < count; i++) {
    packets.push({
      id: i,
      pathIndex: i % paths.length,
      progress: (i / count) % 1,
      kind: i % 3 === 0 ? "post" : "get",
      speed: 0.08 + (i % 4) * 0.015,
    });
  }

  return { backends, paths, packets, balancer };
}

export function tickIntroTraffic(
  state: IntroTrafficState,
  options: StageTickOptions = {},
): IntroTrafficState {
  if (options.frozen || options.paused) {
    return state;
  }

  const packets = state.packets.map((packet) => {
    let progress = packet.progress + packet.speed * 0.12;
    if (progress >= 1) {
      progress = 0;
    }
    return { ...packet, progress };
  });

  return { ...state, packets };
}

export function drawIntroTraffic(
  ctx: CanvasRenderingContext2D,
  state: IntroTrafficState,
  scale: number,
): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const path of state.paths) {
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    path.points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  drawServer(ctx, state.balancer.x, state.balancer.y, "#1d4ed8");
  for (const backend of state.backends) {
    drawServer(ctx, backend.x, backend.y, "#64748b");
  }

  for (const packet of state.packets) {
    const path = state.paths[packet.pathIndex];
    if (!path) continue;
    const point = getPointOnPath(path, packet.progress);
    ctx.fillStyle = packet.kind === "post" ? "#f59e0b" : "#2563eb";
    ctx.fillRect(Math.round(point.x - 3), Math.round(point.y - 3), 6, 6);
  }

  ctx.restore();
}
