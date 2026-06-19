import { useEffect, useRef } from "react";
import "../theme/menu-light.css";
import "./menu.css";

interface HelpOverlayProps {
  onClose: () => void;
}

export default function HelpOverlay({ onClose }: HelpOverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
          <p>Route simulated HTTP traffic through your Layer 7 rules.</p>
          <p>Pause to edit rules. Keep success rate high and the queue short.</p>
          <p>Campaign levels unlock in order. Arcade opens after level 3.</p>
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
