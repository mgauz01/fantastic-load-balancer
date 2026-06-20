import { useEffect } from "react";

interface UsePlayKeyboardOptions {
  isRunning: boolean;
  showHelp: boolean;
  onPause: () => void;
  onOpenHelp: () => void;
  onCloseHelp: () => void;
  disabled?: boolean;
}

export function usePlayKeyboard({
  isRunning,
  showHelp,
  onPause,
  onOpenHelp,
  onCloseHelp,
  disabled = false,
}: UsePlayKeyboardOptions): void {
  useEffect(() => {
    if (disabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" && isRunning) {
        event.preventDefault();
        onPause();
        onOpenHelp();
        return;
      }

      if (event.key === "Escape") {
        if (showHelp) {
          event.preventDefault();
          onCloseHelp();
          return;
        }
        onPause();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, isRunning, onCloseHelp, onOpenHelp, onPause, showHelp]);
}
