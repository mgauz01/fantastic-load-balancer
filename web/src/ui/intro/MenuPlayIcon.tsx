interface MenuPlayIconProps {
  active?: boolean;
}

export default function MenuPlayIcon({ active = false }: MenuPlayIconProps) {
  return (
    <span
      className={`menu-play-icon${active ? " menu-play-icon--active" : ""}`}
      aria-hidden="true"
    >
      <svg className="menu-play-icon__svg" viewBox="0 0 16 16" focusable="false">
        <path
          className="menu-play-icon__triangle"
          fill="currentColor"
          d="M5 3 L5 13 L12 8 Z"
        />
      </svg>
    </span>
  );
}
