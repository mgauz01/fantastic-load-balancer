import "../theme/menu-light.css";
import "./menu.css";
import MenuPanel from "./MenuPanel";
import MenuSlot from "./MenuSlot";

interface MenuSubScreenProps {
  title: string;
  subtitle: string;
  body: string;
  note: string;
  onBack: () => void;
}

export default function MenuSubScreen({
  title,
  subtitle,
  body,
  note,
  onBack,
}: MenuSubScreenProps) {
  return (
    <div className="intro-screen" data-theme="menu-light">
      <div className="intro-menu-column">
        <header className="game-title-block">
          <h1 className="game-title">{title}</h1>
          <p className="game-subtitle">{subtitle}</p>
        </header>

        <MenuPanel>
          <p className="menu-subscreen-body">{body}</p>
          <p className="menu-subscreen-note">{note}</p>
        </MenuPanel>

        <MenuPanel>
          <MenuSlot
            label="BACK TO MAIN MENU"
            tabIndex={0}
            focused
            onFocus={() => undefined}
            onSelect={onBack}
          />
        </MenuPanel>
      </div>
    </div>
  );
}
