import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../../api/client";
import type { LeaderboardEntry } from "../../api/types";
import GameTitle from "../intro/GameTitle";
import MenuPanel from "../intro/MenuPanel";
import MenuPlayIcon from "../intro/MenuPlayIcon";
import "../theme/menu-light.css";
import "../intro/menu.css";

interface LeaderboardScreenProps {
  onBack: () => void;
  onPlayArcade?: () => void;
  arcadeUnlocked?: boolean;
}

function formatSurvived(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function hasTieBreakNote(index: number, entries: LeaderboardEntry[]): boolean {
  const previous = entries[index - 1];
  const current = entries[index];
  if (!previous || !current) {
    return false;
  }
  return previous.score === current.score;
}

function rankClass(rank: number): string {
  if (rank === 1) return "leaderboard-table__rank--gold";
  if (rank === 2) return "leaderboard-table__rank--silver";
  if (rank === 3) return "leaderboard-table__rank--bronze";
  if (rank <= 10) return "leaderboard-table__rank--top";
  return "";
}

export default function LeaderboardScreen({
  onBack,
  onPlayArcade,
  arcadeUnlocked = false,
}: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchLeaderboard(10);
        if (!cancelled) setEntries(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load leaderboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const paddedRows = Array.from({ length: 10 }, (_, index) => entries[index] ?? null);

  return (
    <div className="intro-screen" data-theme="menu-light">
      <div className="intro-menu-column">
        <GameTitle animate={false} />
        <header className="game-title-block">
          <h1 className="game-title">LEADERBOARD</h1>
          <p className="game-subtitle">Tie-break: longer active traffic time</p>
        </header>

        <MenuPanel>
          <div className="play-panel__body leaderboard-panel" style={{ background: "var(--panel-inner)" }}>
            {loading ? <p>Loading scores...</p> : null}
            {error ? <p>{error}</p> : null}
            {!loading && !error && entries.length === 0 ? (
              <p className="leaderboard-empty">NO SCORES YET — PLAY ARCADE TO SET ONE</p>
            ) : null}
            {!loading ? (
              <table className="leaderboard-table">
                <caption className="sr-only">Local arcade high scores</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Name</th>
                    <th scope="col">Score</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paddedRows.map((entry, index) => {
                    const rank = index + 1;
                    if (!entry) {
                      return (
                        <tr key={`empty-${rank}`} className="leaderboard-table__row--empty">
                          <td>{rank}</td>
                          <td>---</td>
                          <td>---</td>
                          <td>---</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={entry.id}>
                        <td className={rankClass(rank)}>{rank}</td>
                        <td>{entry.initials}</td>
                        <td className={rank <= 3 ? "leaderboard-table__score--accent" : ""}>
                          {entry.score.toLocaleString()}
                        </td>
                        <td>
                          {formatSurvived(entry.activeTrafficMs)}
                          {hasTieBreakNote(index, entries) ? (
                            <span className="leaderboard-table__tie"> tie</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}
          </div>
        </MenuPanel>

        <MenuPanel>
          <div className="menu-slot-list">
            {onPlayArcade ? (
              <button
                type="button"
                className={`menu-slot${arcadeUnlocked ? "" : " menu-slot--locked"}`}
                disabled={!arcadeUnlocked}
                onClick={() => {
                  if (arcadeUnlocked) onPlayArcade();
                }}
              >
                {arcadeUnlocked ? <MenuPlayIcon /> : <span className="menu-slot__icon-spacer" />}
                <span className="menu-slot__label">PLAY ARCADE</span>
                {!arcadeUnlocked ? <span className="menu-slot__badge">LOCKED</span> : null}
              </button>
            ) : null}
            <button type="button" className="menu-slot menu-slot--focused" onClick={onBack}>
              <MenuPlayIcon active />
              <span className="menu-slot__label">MAIN MENU</span>
            </button>
          </div>
        </MenuPanel>
      </div>
    </div>
  );
}
