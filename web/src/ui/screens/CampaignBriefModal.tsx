import type { CampaignLevel } from "../../game/types";
import MenuPanel from "../intro/MenuPanel";
import "../theme/menu-light.css";
import "../intro/menu.css";

interface CampaignBriefModalProps {
  level: CampaignLevel;
  onClose: () => void;
  onStart: () => void;
}

export default function CampaignBriefModal({ level, onClose, onStart }: CampaignBriefModalProps) {
  return (
    <div className="brief-overlay" data-theme="menu-light" role="presentation">
      <button type="button" className="brief-overlay__scrim" aria-label="Close brief" onClick={onClose} />
      <div
        className="pixel-panel brief-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="brief-title"
      >
        <h2 id="brief-title" className="game-title" style={{ fontSize: 14 }}>
          {level.title.toUpperCase()}
        </h2>
        <MenuPanel>
          <p className="brief-overlay__body">{level.briefMarkdown}</p>
          <p className="menu-subscreen-note">
            Pass: {(level.passThreshold.successRate * 100).toFixed(0)}% over{" "}
            {level.passThreshold.durationTicks}s active traffic
          </p>
        </MenuPanel>
        <div className="play-toolbar">
          <button type="button" onClick={onClose}>
            BACK
          </button>
          <button type="button" onClick={onStart}>
            START LEVEL
          </button>
        </div>
      </div>
    </div>
  );
}
