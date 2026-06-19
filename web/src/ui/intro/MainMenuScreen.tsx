import { useEffect, useState } from "react";
import "../theme/menu-light.css";
import "./menu.css";
import GameTitle from "./GameTitle";
import MenuPanel from "./MenuPanel";
import MenuSlot from "./MenuSlot";
import MenuSlotList, { useMenuSlotNavigation } from "./MenuSlotList";

export interface MenuItem {
  id: string;
  label: string;
  locked?: boolean;
}

const DEFAULT_ITEMS: MenuItem[] = [
  { id: "campaign", label: "CAMPAIGN" },
  { id: "arcade", label: "ENDLESS ARCADE", locked: true },
  { id: "leaderboard", label: "LEADERBOARD" },
  { id: "help", label: "HELP" },
];

interface MainMenuScreenProps {
  items?: MenuItem[];
  version?: string;
  onSelect?: (id: string) => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function MainMenuScreen({
  items = DEFAULT_ITEMS,
  version = "v0.1.0",
  onSelect,
}: MainMenuScreenProps) {
  const [focusedId, setFocusedId] = useState(items[0]?.id ?? "");
  const selectableItems = items.filter((item) => !item.locked);
  const { listRef, onKeyDown, focusSlot } = useMenuSlotNavigation(selectableItems.length);

  useEffect(() => {
    focusSlot(0);
  }, [focusSlot]);

  const handleSelect = (id: string, locked?: boolean) => {
    if (locked) return;
    onSelect?.(id);
  };

  return (
    <div
      className="intro-screen"
      data-theme="menu-light"
      onKeyDown={onKeyDown}
    >
      <a className="intro-skip-link" href="#main-menu">
        Skip to main menu
      </a>

      <div className="intro-menu-column">
        <GameTitle animate={!prefersReducedMotion()} />

        <MenuPanel>
          <div id="main-menu" ref={listRef}>
            <MenuSlotList>
              {items.map((item) => (
                <MenuSlot
                  key={item.id}
                  label={item.label}
                  locked={item.locked}
                  focused={focusedId === item.id}
                  tabIndex={item.locked ? -1 : focusedId === item.id ? 0 : -1}
                  onFocus={() => setFocusedId(item.id)}
                  onSelect={() => handleSelect(item.id, item.locked)}
                />
              ))}
            </MenuSlotList>
          </div>
        </MenuPanel>

        <footer className="menu-footer">
          <span>{version}</span>
          <button
            type="button"
            className="menu-footer__help"
            onClick={() => handleSelect("help")}
          >
            ? Help
          </button>
        </footer>
      </div>
    </div>
  );
}
