import { useEffect, useState } from "react";
import { currentStreakMultiplier } from "../../game/arcade";
import { useArcadeSession } from "../../hooks/useArcadeSession";
import type { ListenerPort } from "../../sim/types";
import InitialsModal from "../modals/InitialsModal";
import TrafficStage from "../canvas/TrafficStage";
import HealthPanel from "../panels/HealthPanel";
import RuleEditorPanel from "../panels/RuleEditorPanel";
import TrafficLogPanel from "../panels/TrafficLogPanel";
import "../theme/play.css";

interface ArcadeScreenProps {
  onExit: () => void;
  onViewLeaderboard: () => void;
}

export default function ArcadeScreen({ onExit, onViewLeaderboard }: ArcadeScreenProps) {
  const [listenerPort, setListenerPort] = useState<ListenerPort>(80);
  const [showInitials, setShowInitials] = useState(false);

  const { state, scoreState, gameOver, pause, resume, retry, successRate, spawnRate, isRunning, isPaused } =
    useArcadeSession({
      onGameOver: () => setShowInitials(true),
    });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" && isRunning) {
        event.preventDefault();
        pause();
      }
      if (event.key === "Escape" && !gameOver) {
        pause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameOver, isRunning, pause]);

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

      <div className="play-screen__grid">
        <TrafficLogPanel entries={state.log} />
        <TrafficStage latestEntry={latestEntry} />
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <RuleEditorPanel
            listenerPort={listenerPort}
            rules={state.listenerRules[listenerPort]}
            onListenerChange={setListenerPort}
          />
          <HealthPanel
            pools={state.pools}
            recoveryTimers={state.healthRecoveryTimers}
            autoRecovery
          />
        </div>
      </div>

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
    </div>
  );
}
