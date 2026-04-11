import { useEffect } from "react";

interface ShortcutHandlers {
  onNewTask: () => void;
  onCloseModal: () => void;
  onUndo: () => void;
}

export function useKeyboardShortcuts({ onNewTask, onCloseModal, onUndo }: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in input/textarea
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Ctrl+Z: app-level undo (입력 중에는 브라우저 기본 undo 유지)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !isTyping) {
        e.preventDefault();
        onUndo();
        return;
      }

      if (isTyping) return;

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
  }, [onNewTask, onCloseModal, onUndo]);
}
