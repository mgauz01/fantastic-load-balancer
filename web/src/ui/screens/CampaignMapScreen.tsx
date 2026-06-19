import "../theme/menu-light.css";
import "../intro/menu.css";
import type { CampaignProgress } from "../../api/types";
import { listCampaignLevels } from "../../game/campaign";
import { hasPassBadge, isLevelUnlocked } from "../../hooks/useProgress";
import MenuPanel from "../intro/MenuPanel";
import MenuPlayIcon from "../intro/MenuPlayIcon";
import MenuSlotList from "../intro/MenuSlotList";

interface CampaignMapScreenProps {
  progress: CampaignProgress;
  loading?: boolean;
  onBack: () => void;
  onSelectLevel: (levelId: string) => void;
}

export default function CampaignMapScreen({
  progress,
  loading = false,
  onBack,
  onSelectLevel,
}: CampaignMapScreenProps) {
  const levels = listCampaignLevels();

  return (
    <div className="intro-screen campaign-map-screen" data-theme="menu-light">
      <div className="intro-menu-column">
        <header className="game-title-block">
          <h1 className="game-title">CAMPAIGN</h1>
          <p className="game-subtitle">
            {loading ? "Loading progress..." : `Unlocked through level ${progress.highestUnlocked}`}
          </p>
        </header>

        <MenuPanel>
          <MenuSlotList>
            {levels.map((level) => {
              const unlocked = isLevelUnlocked(level.index, progress);
              const passed = hasPassBadge(level.id, progress);
              return (
                <button
                  key={level.id}
                  type="button"
                  className={`menu-slot${unlocked ? "" : " menu-slot--locked"}`}
                  disabled={!unlocked}
                  aria-disabled={!unlocked || undefined}
                  onClick={() => {
                    if (unlocked) onSelectLevel(level.id);
                  }}
                >
                  {unlocked ? <MenuPlayIcon /> : <span className="menu-slot__icon-spacer" />}
                  <span className="menu-slot__label">
                    {String(level.index).padStart(2, "0")} {level.title.toUpperCase()}
                  </span>
                  {passed ? <span className="level-slot__badge">PASS</span> : null}
                  {!unlocked ? <span className="menu-slot__badge">LOCKED</span> : null}
                </button>
              );
            })}
          </MenuSlotList>
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
