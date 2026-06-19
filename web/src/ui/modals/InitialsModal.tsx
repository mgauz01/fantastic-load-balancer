import { useState } from "react";
import { submitLeaderboardScore } from "../../api/client";
import { normalizeInitials } from "../../game/arcade";
import "../theme/menu-light.css";
import "../intro/menu.css";

interface InitialsModalProps {
  score: number;
  activeTrafficMs: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function InitialsModal({
  score,
  activeTrafficMs,
  onClose,
  onSubmitted,
}: InitialsModalProps) {
  const [initials, setInitials] = useState("AAA");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitLeaderboardScore({
        initials: normalizeInitials(initials),
        score,
        activeTrafficMs,
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save score");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="brief-overlay" data-theme="menu-light" role="presentation">
      <button type="button" className="brief-overlay__scrim" aria-label="Close" onClick={onClose} />
      <div
        className="pixel-panel brief-overlay__panel initials-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="initials-title"
      >
        <h2 id="initials-title" className="game-title" style={{ fontSize: 14 }}>
          GAME OVER
        </h2>
        <p className="brief-overlay__body">
          Score {score} — survived {Math.round(activeTrafficMs / 1000)}s active traffic
        </p>
        <label className="initials-modal__label" htmlFor="arcade-initials">
          Enter 3-letter initials
        </label>
        <input
          id="arcade-initials"
          className="initials-modal__input"
          type="text"
          maxLength={3}
          value={initials}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setInitials(event.target.value.toUpperCase())}
        />
        {error ? <p className="initials-modal__error">{error}</p> : null}
        <div className="play-toolbar">
          <button type="button" onClick={onClose} disabled={submitting}>
            SKIP
          </button>
          <button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "SAVING..." : "SUBMIT SCORE"}
          </button>
        </div>
      </div>
    </div>
  );
}
