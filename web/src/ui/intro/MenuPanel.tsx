import type { ReactNode } from "react";

interface MenuPanelProps {
  children: ReactNode;
}

export default function MenuPanel({ children }: MenuPanelProps) {
  return <div className="pixel-panel menu-panel">{children}</div>;
}
