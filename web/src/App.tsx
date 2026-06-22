import { useMemo, useState } from "react";
import { getCampaignLevel } from "./game/campaign";
import { useProgress } from "./hooks/useProgress";
import HelpOverlay from "./ui/intro/HelpOverlay";
import IntroTrafficBackdrop from "./ui/intro/IntroTrafficBackdrop";
import MainMenuScreen, { type MenuItem } from "./ui/intro/MainMenuScreen";
import ArcadeScreen from "./ui/screens/ArcadeScreen";
import CampaignBriefModal from "./ui/screens/CampaignBriefModal";
import CampaignMapScreen from "./ui/screens/CampaignMapScreen";
import LeaderboardScreen from "./ui/screens/LeaderboardScreen";
import PlayScreen from "./ui/screens/PlayScreen";

type AppView = "menu" | "campaign" | "play" | "arcade" | "leaderboard" | "help";

function viewFromMenuId(id: string): AppView | null {
  switch (id) {
    case "campaign":
      return "campaign";
    case "arcade":
      return "arcade";
    case "leaderboard":
      return "leaderboard";
    case "help":
      return "help";
    default:
      return null;
  }
}

export default function App() {
  const [view, setView] = useState<AppView>("menu");
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const { progress, loading, completeLevel, arcadeUnlocked } = useProgress();

  const menuItems = useMemo<MenuItem[]>(
    () => [
      { id: "campaign", label: "CAMPAIGN" },
      { id: "arcade", label: "ENDLESS ARCADE", locked: !arcadeUnlocked },
      { id: "leaderboard", label: "LEADERBOARD" },
      { id: "help", label: "HELP" },
    ],
    [arcadeUnlocked],
  );

  const selectedLevel = selectedLevelId ? getCampaignLevel(selectedLevelId) : null;

  const handleMenuSelect = (id: string) => {
    const next = viewFromMenuId(id);
    if (next) setView(next);
  };

  const handleSelectLevel = (levelId: string) => {
    setSelectedLevelId(levelId);
    setBriefOpen(true);
  };

  const handleStartLevel = () => {
    setBriefOpen(false);
    setView("play");
  };

  const handleExitPlay = () => {
    setView("campaign");
  };

  const handleLevelPassed = () => {
    if (selectedLevelId) {
      void completeLevel(selectedLevelId);
    }
  };

  const showBackdrop = view === "menu" || view === "help";

  return (
    <>
      {showBackdrop ? <IntroTrafficBackdrop /> : null}
      {view === "menu" || view === "help" ? (
        <MainMenuScreen items={menuItems} onSelect={handleMenuSelect} />
      ) : null}
      {view === "campaign" ? (
        <CampaignMapScreen
          progress={progress}
          loading={loading}
          onBack={() => setView("menu")}
          onSelectLevel={handleSelectLevel}
        />
      ) : null}
      {view === "arcade" ? (
        <ArcadeScreen
          onExit={() => setView("menu")}
          onViewLeaderboard={() => setView("leaderboard")}
        />
      ) : null}
      {view === "leaderboard" ? (
        <LeaderboardScreen
          arcadeUnlocked={arcadeUnlocked}
          onBack={() => setView("menu")}
          onPlayArcade={() => setView("arcade")}
        />
      ) : null}
      {briefOpen && selectedLevel ? (
        <CampaignBriefModal
          level={selectedLevel}
          onClose={() => setBriefOpen(false)}
          onStart={handleStartLevel}
        />
      ) : null}
      {view === "play" && selectedLevel ? (
        <PlayScreen
          level={selectedLevel}
          onExit={handleExitPlay}
          onPassed={handleLevelPassed}
        />
      ) : null}
      {view === "help" ? <HelpOverlay onClose={() => setView("menu")} /> : null}
    </>
  );
}
