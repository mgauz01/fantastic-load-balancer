import type { BackendPool } from "../../sim/types";

interface HealthPanelProps {
  pools: Record<string, BackendPool>;
  recoveryTimers: Record<string, number>;
  autoRecovery: boolean;
}

export default function HealthPanel({ pools, recoveryTimers, autoRecovery }: HealthPanelProps) {
  return (
    <section className="play-panel">
      <h2 className="play-panel__title">HEALTH</h2>
      <div className="play-panel__body">
        <div className="health-list">
          {Object.values(pools).flatMap((pool) =>
            pool.backends.map((backend) => {
              const healthy = backend.health === "healthy";
              const recovery = recoveryTimers[backend.id];
              return (
                <div key={backend.id} className="health-row">
                  <span>
                    {pool.name}/{backend.name}
                  </span>
                  <span>{healthy ? "UP" : "DOWN"}</span>
                  <div className={`health-row__bar${healthy ? "" : " health-row__bar--down"}`}>
                    <span style={{ width: healthy ? "100%" : "18%" }} />
                  </div>
                  {!healthy && autoRecovery && recovery ? (
                    <span>Recovery in {recovery}s</span>
                  ) : null}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </section>
  );
}
