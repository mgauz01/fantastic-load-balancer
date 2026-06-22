import { useEffect, useRef } from "react";
import "../theme/menu-light.css";
import "./menu.css";

export type HelpVariant = "menu" | "play";

interface HelpOverlayProps {
  onClose: () => void;
  variant?: HelpVariant;
}

const HELP_COPY: Record<HelpVariant, string[]> = {
  menu: [
    "Route simulated HTTP traffic through your Layer 7 rules.",
    "Pause to edit rules. Keep success rate high and the queue short.",
    "Campaign levels unlock in order. Arcade opens after level 3.",
  ],
  play: [
    "Route simulated HTTP traffic through your Layer 7 rules.",
    "Press PAUSE or ? during a run to freeze traffic and edit rules.",
    "RESUME continues the tick loop with your updated routing table.",
    "On narrow screens, use the LOG / STAGE / RULES / HEALTH tabs.",
    "Keep success rate above the pass threshold before time runs out.",
  ],
};

export default function HelpOverlay({ onClose, variant = "menu" }: HelpOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const isPlay = variant === "play";

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isPlay) event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlay, onClose]);

  if (isPlay) {
    return (
      <div className="play-help-overlay" role="presentation">
        <button
          type="button"
          className="play-help-overlay__scrim"
          aria-label="Close help"
          onClick={onClose}
        />
        <div
          className="play-panel play-help-overlay__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="play-help-title"
        >
          <h2 id="play-help-title" className="play-panel__title">
            HELP
          </h2>
          <div className="play-panel__body play-help-overlay__body">
            {HELP_COPY.play.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="play-help-overlay__close"
            onClick={onClose}
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="help-overlay" data-theme="menu-light" role="presentation">
      <button
        type="button"
        className="help-overlay__scrim"
        aria-label="Close help"
        onClick={onClose}
      />
      <div
        className="pixel-panel help-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        <h2 id="help-title" className="help-overlay__title">
          HELP
        </h2>
        <div className="help-overlay__body">
          {HELP_COPY.menu.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button
          ref={closeRef}
          type="button"
          className="menu-slot help-overlay__close"
          onClick={onClose}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
