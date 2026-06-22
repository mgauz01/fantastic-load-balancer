import { useCallback, useState } from "react";
import type { CampaignLevel } from "../../game/types";
import { useSimSession } from "../../hooks/useSimSession";
import type { ListenerPort } from "../../sim/types";
import TrafficStage from "../canvas/TrafficStage";
import HealthPanel from "../panels/HealthPanel";
import RuleEditorPanel from "../panels/RuleEditorPanel";
import TrafficLogPanel from "../panels/TrafficLogPanel";
import HelpOverlay from "../intro/HelpOverlay";
import PlayScreenPanels from "../play/PlayScreenPanels";
import { usePlayKeyboard } from "../play/usePlayKeyboard";
import "../theme/play.css";

interface PlayScreenProps {
  level: CampaignLevel;
  onExit: () => void;
  onPassed: () => void;
}

export default function PlayScreen({ level, onExit, onPassed }: PlayScreenProps) {
  const [listenerPort, setListenerPort] = useState<ListenerPort>(80);
  const [resultBanner, setResultBanner] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

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

  const openHelp = useCallback(() => {
    if (isRunning) {
      pause();
    }
    setShowHelp(true);
  }, [isRunning, pause]);

  const closeHelp = useCallback(() => {
    setShowHelp(false);
  }, []);

  usePlayKeyboard({
    isRunning,
    showHelp,
    onPause: pause,
    onOpenHelp: openHelp,
    onCloseHelp: closeHelp,
  });

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

      <PlayScreenPanels
        log={<TrafficLogPanel entries={state.log} />}
        stage={
          <TrafficStage latestEntry={latestEntry} pools={state.pools} paused={isPaused} />
        }
        rules={
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
        }
        health={
          <HealthPanel
            pools={state.pools}
            recoveryTimers={state.healthRecoveryTimers}
            autoRecovery={level.autoRecovery}
          />
        }
      />

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
        <button type="button" onClick={openHelp}>
          HELP
        </button>
        <button type="button" onClick={retry}>
          RETRY
        </button>
        <button type="button" onClick={onExit}>
          EXIT
        </button>
      </div>

      {showHelp ? <HelpOverlay variant="play" onClose={closeHelp} /> : null}
    </div>
  );
}
