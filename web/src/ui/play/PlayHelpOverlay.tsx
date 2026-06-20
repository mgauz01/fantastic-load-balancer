import { useEffect, useRef } from "react";

interface PlayHelpOverlayProps {
  onClose: () => void;
}

export default function PlayHelpOverlay({ onClose }: PlayHelpOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
          <p>Route simulated HTTP traffic through your Layer 7 rules.</p>
          <p>Press PAUSE or ? during a run to freeze traffic and edit rules.</p>
          <p>RESUME continues the tick loop with your updated routing table.</p>
          <p>On narrow screens, use the LOG / STAGE / RULES / HEALTH tabs.</p>
          <p>Keep success rate above the pass threshold before time runs out.</p>
        </div>
        <button ref={closeRef} type="button" className="play-help-overlay__close" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
}
