import { useState } from "react";
import HelpOverlay from "./ui/intro/HelpOverlay";
import IntroTrafficBackdrop from "./ui/intro/IntroTrafficBackdrop";
import MainMenuScreen from "./ui/intro/MainMenuScreen";
import MenuSubScreen from "./ui/intro/MenuSubScreen";
import { viewFromMenuId, type AppView } from "./ui/intro/navigation";

export default function App() {
  const [view, setView] = useState<AppView>("menu");

  const handleMenuSelect = (id: string) => {
    const next = viewFromMenuId(id);
    if (next) setView(next);
  };

  return (
    <>
      <IntroTrafficBackdrop />
      {view === "menu" || view === "help" ? (
        <MainMenuScreen onSelect={handleMenuSelect} />
      ) : null}
      {view === "campaign" ? (
        <MenuSubScreen
          title="CAMPAIGN"
          subtitle="Progressive traffic trials"
          body="Route simulated traffic, tune Layer 7 rules, and hit the success target before the queue overflows."
          note="Level select ships in the next milestone."
          onBack={() => setView("menu")}
        />
      ) : null}
      {view === "leaderboard" ? (
        <MenuSubScreen
          title="LEADERBOARD"
          subtitle="Endless Arcade standings"
          body="Three-letter initials and your best run time. Scores stay on this device until cloud sync arrives."
          note="Score table ships in the next milestone."
          onBack={() => setView("menu")}
        />
      ) : null}
      {view === "help" ? <HelpOverlay onClose={() => setView("menu")} /> : null}
    </>
  );
}
