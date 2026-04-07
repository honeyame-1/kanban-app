import { useEffect } from "react";

interface ShortcutHandlers {
  onNewTask: () => void;
  onCloseModal: () => void;
}

export function useKeyboardShortcuts({ onNewTask, onCloseModal }: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "n":
        case "N":
          e.preventDefault();
          onNewTask();
          break;
        case "Escape":
          onCloseModal();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewTask, onCloseModal]);
}
