export function drawServer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
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

export function drawClient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  const left = Math.round(x - 6);
  const top = Math.round(y - 5);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(left, top, 12, 10);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(left + 2, top + 2, 8, 5);
}
