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
}

export default function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
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

  return (
    <div className="intro-screen" data-theme="menu-light">
      <div className="intro-menu-column">
        <GameTitle animate={false} />
        <header className="game-title-block">
          <h1 className="game-title">LEADERBOARD</h1>
          <p className="game-subtitle">Endless Arcade top scores</p>
        </header>

        <MenuPanel>
          <div className="play-panel__body" style={{ background: "var(--panel-inner)" }}>
            {loading ? <p>Loading scores...</p> : null}
            {error ? <p>{error}</p> : null}
            {!loading && !error && entries.length === 0 ? (
              <p>No scores yet. Clear Endless Arcade to post one.</p>
            ) : null}
            {!loading && entries.length > 0 ? (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Initials</th>
                    <th scope="col">Score</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={entry.id}>
                      <td>{index + 1}</td>
                      <td>{entry.initials}</td>
                      <td>{entry.score}</td>
                      <td>{Math.round(entry.activeTrafficMs / 1000)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        </MenuPanel>

        <MenuPanel>
          <button type="button" className="menu-slot menu-slot--focused" onClick={onBack}>
            <MenuPlayIcon active />
            <span className="menu-slot__label">BACK TO MAIN MENU</span>
          </button>
        </MenuPanel>
      </div>
    </div>
  );
}
