import MenuPlayIcon from "./MenuPlayIcon";

interface MenuSlotProps {
  label: string;
  locked?: boolean;
  focused?: boolean;
  tabIndex: number;
  onSelect: () => void;
  onFocus: () => void;
}

export default function MenuSlot({
  label,
  locked = false,
  focused = false,
  tabIndex,
  onSelect,
  onFocus,
}: MenuSlotProps) {
  return (
    <button
      type="button"
      className={`menu-slot${focused ? " menu-slot--focused" : ""}${locked ? " menu-slot--locked" : ""}`}
      disabled={locked}
      aria-disabled={locked || undefined}
      tabIndex={tabIndex}
      onClick={() => {
        if (!locked) onSelect();
      }}
      onFocus={onFocus}
    >
      {!locked ? <MenuPlayIcon active={focused} /> : <span className="menu-slot__icon-spacer" />}
      <span className="menu-slot__label">{label}</span>
      {locked ? <span className="menu-slot__badge">LOCKED</span> : null}
    </button>
  );
}
