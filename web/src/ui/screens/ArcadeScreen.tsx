import { useCallback, useState } from "react";
import { currentStreakMultiplier } from "../../game/arcade";
import { useArcadeSession } from "../../hooks/useArcadeSession";
import type { ListenerPort } from "../../sim/types";
import InitialsModal from "../modals/InitialsModal";
import TrafficStage from "../canvas/TrafficStage";
import HealthPanel from "../panels/HealthPanel";
import RuleEditorPanel from "../panels/RuleEditorPanel";
import TrafficLogPanel from "../panels/TrafficLogPanel";
import HelpOverlay from "../intro/HelpOverlay";
import PlayScreenPanels from "../play/PlayScreenPanels";
import { usePlayKeyboard } from "../play/usePlayKeyboard";
import "../theme/play.css";

interface ArcadeScreenProps {
  onExit: () => void;
  onViewLeaderboard: () => void;
}

export default function ArcadeScreen({ onExit, onViewLeaderboard }: ArcadeScreenProps) {
  const [listenerPort, setListenerPort] = useState<ListenerPort>(80);
  const [showInitials, setShowInitials] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const { state, scoreState, gameOver, pause, resume, retry, upsertRule, removeRule, successRate, spawnRate, isRunning, isPaused } =
    useArcadeSession({
      onGameOver: () => setShowInitials(true),
    });

  const openHelp = useCallback(() => {
    if (!gameOver) {
      pause();
    }
    setShowHelp(true);
  }, [gameOver, pause]);

  const closeHelp = useCallback(() => {
    setShowHelp(false);
  }, []);

  usePlayKeyboard({
    isRunning,
    showHelp,
    onPause: pause,
    onOpenHelp: openHelp,
    onCloseHelp: closeHelp,
    disabled: Boolean(gameOver),
  });

  const latestEntry = state.log[state.log.length - 1] ?? null;
  const multiplier = currentStreakMultiplier(scoreState.streak);

  return (
    <div className="play-screen" data-theme="play">
      <header className="play-screen__header">
        <h1 className="play-screen__title">ENDLESS ARCADE</h1>
        <div className="play-screen__stats">
          <span>Score {scoreState.score}</span>
          <span>Streak x{multiplier}</span>
          <span>Rate {(successRate * 100).toFixed(1)}%</span>
          <span>Spawn {spawnRate}/tick</span>
          <span>Queue {state.queue.length}</span>
          <span>Time {state.activeTrafficTicks}s</span>
        </div>
      </header>

      {gameOver ? (
        <p role="status" className="arcade-game-over">
          Game over —{" "}
          {gameOver.reason === "queue" ? "queue overflow" : "error rate exceeded 25% over 15s"}
        </p>
      ) : null}

      <PlayScreenPanels
        log={<TrafficLogPanel entries={state.log} />}
        stage={
          <TrafficStage
            latestEntry={latestEntry}
            pools={state.pools}
            paused={isPaused || Boolean(gameOver)}
          />
        }
        rules={
          <RuleEditorPanel
            listenerPort={listenerPort}
            rules={state.listenerRules[listenerPort]}
            pools={state.pools}
            editable={isPaused && !gameOver}
            onListenerChange={setListenerPort}
            onUpsertRule={(draft) => upsertRule(listenerPort, draft)}
            onDeleteRule={(ruleId) => removeRule(listenerPort, ruleId)}
          />
        }
        health={
          <HealthPanel
            pools={state.pools}
            recoveryTimers={state.healthRecoveryTimers}
            autoRecovery
          />
        }
      />

      <div className="play-toolbar">
        {gameOver ? (
          <>
            <button type="button" onClick={retry}>
              PLAY AGAIN
            </button>
            <button type="button" onClick={onViewLeaderboard}>
              LEADERBOARD
            </button>
            <button type="button" onClick={onExit}>
              MAIN MENU
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {showInitials && gameOver ? (
        <InitialsModal
          score={gameOver.score}
          activeTrafficMs={gameOver.activeTrafficMs}
          onClose={() => setShowInitials(false)}
          onSubmitted={() => {
            setShowInitials(false);
            onViewLeaderboard();
          }}
        />
      ) : null}

      {showHelp ? <HelpOverlay variant="play" onClose={closeHelp} /> : null}
    </div>
  );
}
