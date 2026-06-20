import { useCallback, useEffect, useState } from "react";
import type { CampaignLevel } from "../../game/types";
import { useSimSession } from "../../hooks/useSimSession";
import type { ListenerPort } from "../../sim/types";
import TrafficStage from "../canvas/TrafficStage";
import HealthPanel from "../panels/HealthPanel";
import RuleEditorPanel from "../panels/RuleEditorPanel";
import TrafficLogPanel from "../panels/TrafficLogPanel";
import "../theme/play.css";

interface PlayScreenProps {
  level: CampaignLevel;
  onExit: () => void;
  onPassed: () => void;
}

export default function PlayScreen({ level, onExit, onPassed }: PlayScreenProps) {
  const [listenerPort, setListenerPort] = useState<ListenerPort>(80);
  const [resultBanner, setResultBanner] = useState<string | null>(null);

  const handleResult = useCallback(
    (result: { status: "running" | "passed" | "failed_time" | "failed_early" }) => {
      if (result.status === "passed") {
        setResultBanner("Level passed");
        onPassed();
      } else if (result.status === "failed_early") {
        setResultBanner("Early fail — rate cannot recover");
      } else if (result.status === "failed_time") {
        setResultBanner("Time expired below pass threshold");
      }
    },
    [onPassed],
  );

  const { state, pause, resume, retry, upsertRule, removeRule, successRate, isRunning, isPaused } =
    useSimSession(level, {
      onResult: handleResult,
    });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" && isRunning) {
        event.preventDefault();
        pause();
      }
      if (event.key === "Escape") {
        pause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning, pause]);

  const latestEntry = state.log[state.log.length - 1] ?? null;

  return (
    <div className="play-screen" data-theme="play">
      <header className="play-screen__header">
        <h1 className="play-screen__title">{level.title.toUpperCase()}</h1>
        <div className="play-screen__stats">
          <span>Rate {(successRate * 100).toFixed(1)}%</span>
          <span>
            Time {state.activeTrafficTicks}/{level.passThreshold.durationTicks}s
          </span>
          <span>{isRunning ? "RUNNING" : "CONFIGURE"}</span>
        </div>
      </header>

      {resultBanner ? (
        <p role="status" style={{ color: "var(--color-accent)", fontSize: 22 }}>
          {resultBanner}
        </p>
      ) : null}

      <div className="play-screen__grid">
        <TrafficLogPanel entries={state.log} />
        <TrafficStage latestEntry={latestEntry} pools={state.pools} paused={isPaused} />
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <RuleEditorPanel
            listenerPort={listenerPort}
            rules={state.listenerRules[listenerPort]}
            pools={state.pools}
            editable={isPaused}
            displayHeaders={level.displayHeaders}
            onListenerChange={setListenerPort}
            onUpsertRule={(draft) => upsertRule(listenerPort, draft)}
            onDeleteRule={(ruleId) => removeRule(listenerPort, ruleId)}
          />
          <HealthPanel
            pools={state.pools}
            recoveryTimers={state.healthRecoveryTimers}
            autoRecovery={level.autoRecovery}
          />
        </div>
      </div>

      <div className="play-toolbar">
        {isPaused ? (
          <button type="button" onClick={resume}>
            RESUME
          </button>
        ) : (
          <button type="button" onClick={pause}>
            PAUSE
          </button>
        )}
        <button type="button" onClick={retry}>
          RETRY
        </button>
        <button type="button" onClick={onExit}>
          EXIT
        </button>
      </div>
    </div>
  );
}
