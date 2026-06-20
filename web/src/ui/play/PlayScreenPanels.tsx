import { useState, type ReactNode } from "react";

export type PlayPanelTab = "log" | "stage" | "rules" | "health";

const TAB_LABELS: Record<PlayPanelTab, string> = {
  log: "LOG",
  stage: "STAGE",
  rules: "RULES",
  health: "HEALTH",
};

interface PlayScreenPanelsProps {
  log: ReactNode;
  stage: ReactNode;
  rules: ReactNode;
  health: ReactNode;
}

export default function PlayScreenPanels({ log, stage, rules, health }: PlayScreenPanelsProps) {
  const [activeTab, setActiveTab] = useState<PlayPanelTab>("stage");

  return (
    <>
      <div className="play-screen__tabs" role="tablist" aria-label="Play panels">
        {(Object.keys(TAB_LABELS) as PlayPanelTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`play-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`play-panel-${tab}`}
            className={`play-screen__tab${activeTab === tab ? " play-screen__tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="play-screen__grid play-screen__grid--tabbed" data-active-tab={activeTab}>
        <div
          className="play-screen__panel"
          data-panel="log"
          role="tabpanel"
          id="play-panel-log"
          aria-labelledby="play-tab-log"
        >
          {log}
        </div>
        <div
          className="play-screen__panel"
          data-panel="stage"
          role="tabpanel"
          id="play-panel-stage"
          aria-labelledby="play-tab-stage"
        >
          {stage}
        </div>
        <div
          className="play-screen__panel"
          data-panel="rules"
          role="tabpanel"
          id="play-panel-rules"
          aria-labelledby="play-tab-rules"
        >
          {rules}
        </div>
        <div
          className="play-screen__panel"
          data-panel="health"
          role="tabpanel"
          id="play-panel-health"
          aria-labelledby="play-tab-health"
        >
          {health}
        </div>
      </div>
    </>
  );
}
