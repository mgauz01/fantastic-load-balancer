import { useEffect, useRef } from "react";
import type { RequestLogEntry } from "../../sim/types";

interface TrafficStageProps {
  latestEntry: RequestLogEntry | null;
}

export default function TrafficStage({ latestEntry }: TrafficStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 320;
    const height = 180;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 90);
    ctx.lineTo(160, 90);
    ctx.lineTo(296, 90);
    ctx.stroke();

    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(148, 78, 24, 24);

    if (latestEntry) {
      const color = latestEntry.outcome === 200 ? "#22c55e" : "#dc2626";
      ctx.fillStyle = color;
      ctx.fillRect(260, 82, 12, 12);
    }
  }, [latestEntry]);

  return (
    <section className="play-panel">
      <h2 className="play-panel__title">STAGE</h2>
      <div className="play-panel__body">
        <canvas ref={canvasRef} className="play-stage-canvas" aria-hidden="true" />
      </div>
    </section>
  );
}
