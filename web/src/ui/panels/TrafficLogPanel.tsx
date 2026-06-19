import type { RequestLogEntry } from "../../sim/types";

interface TrafficLogPanelProps {
  entries: RequestLogEntry[];
}

export default function TrafficLogPanel({ entries }: TrafficLogPanelProps) {
  return (
    <section className="play-panel">
      <h2 className="play-panel__title">TRAFFIC LOG</h2>
      <div className="play-panel__body">
        {entries.length === 0 ? (
          <p>Waiting for routed requests...</p>
        ) : (
          <ul className="traffic-log" aria-live="polite">
            {[...entries].reverse().map((entry) => (
              <li
                key={entry.id}
                className={`traffic-log__row ${
                  entry.outcome === 200 ? "traffic-log__row--ok" : "traffic-log__row--fail"
                }`}
              >
                {entry.outcome} :{entry.listenerPort} {entry.method} {entry.host}
                {entry.path}
                {entry.backendName ? ` -> ${entry.backendName}` : ""}
                {entry.tlsTerminated ? " [TLS]" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
