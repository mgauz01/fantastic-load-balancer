import { useCallback, useRef, type KeyboardEvent, type ReactNode } from "react";

interface MenuSlotListProps {
  children: ReactNode;
}

export default function MenuSlotList({ children }: MenuSlotListProps) {
  return (
    <div className="menu-slot-list" role="list">
      {children}
    </div>
  );
}

export function useMenuSlotNavigation(itemCount: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const focusedIndexRef = useRef(0);

  const focusSlot = useCallback((index: number) => {
    const list = listRef.current;
    if (!list) return;
    const buttons = list.querySelectorAll<HTMLButtonElement>(".menu-slot:not(:disabled)");
    const clamped = Math.max(0, Math.min(index, buttons.length - 1));
    const target = buttons[clamped];
    if (target) {
      focusedIndexRef.current = clamped;
      target.focus();
      target.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    }
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (itemCount === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusSlot(focusedIndexRef.current + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusSlot(focusedIndexRef.current - 1);
      }
    },
    [focusSlot, itemCount],
  );

  return { listRef, onKeyDown, focusSlot };
}
