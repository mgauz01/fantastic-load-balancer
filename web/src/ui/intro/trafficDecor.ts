export const DECOR_WIDTH = 320;
export const DECOR_HEIGHT = 180;
export const MAX_DECOR_PACKETS = 12;
export const DECOR_TICK_MS = 100;

export type PacketKind = "get" | "post";

export interface BackendNode {
  id: number;
  x: number;
  y: number;
}

export interface DecorPacket {
  id: number;
  pathIndex: number;
  progress: number;
  kind: PacketKind;
  speed: number;
}

export interface DecorPath {
  points: Array<{ x: number; y: number }>;
}

export interface DecorTrafficState {
  backends: BackendNode[];
  paths: DecorPath[];
  packets: DecorPacket[];
  balancer: { x: number; y: number };
}

export interface TickOptions {
  frozen?: boolean;
  paused?: boolean;
}

const BACKEND_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 48, y: 36 },
  { x: 272, y: 36 },
  { x: 48, y: 144 },
  { x: 272, y: 144 },
  { x: 160, y: 152 },
];

export function createDecorTrafficState(): DecorTrafficState {
  const balancer = { x: 160, y: 88 };
  const backends = BACKEND_POSITIONS.map((pos, id) => ({ id, ...pos }));
  const paths = backends.map((backend) => ({
    points: [balancer, { x: (balancer.x + backend.x) / 2, y: balancer.y - 12 }, backend],
  }));

  const packets: DecorPacket[] = [];
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

export function advanceDecorTraffic(
  state: DecorTrafficState,
  _deltaMs: number,
  options: TickOptions = {},
): DecorTrafficState {
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

export function tickDecorTraffic(
  state: DecorTrafficState,
  deltaMs: number,
  options?: TickOptions,
): DecorTrafficState {
  return advanceDecorTraffic(state, deltaMs, options);
}

export function getPointOnPath(path: DecorPath, t: number): { x: number; y: number } {
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

export function drawDecorTraffic(
  ctx: CanvasRenderingContext2D,
  state: DecorTrafficState,
  scale: number,
): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, DECOR_WIDTH, DECOR_HEIGHT);

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

function drawServer(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const left = Math.round(x - 8);
  const top = Math.round(y - 6);
  ctx.fillStyle = color;
  ctx.fillRect(left, top, 16, 12);
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(left + 4, top + 2, 8, 4);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(left, top, 16, 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(left, top + 10, 16, 2);
}
