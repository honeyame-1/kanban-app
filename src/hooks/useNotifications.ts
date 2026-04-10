import { useEffect, useRef } from "react";
import type { Task } from "../types";

const NOTIF_KEY_PREFIX = "kanban-notif-";

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function useNotifications(tasks: Task[]) {
  // Read tasks via ref so the effect can fire only once per day
  // without re-running on every fetch.
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    let cancelled = false;
    const todayStr = todayLocal();
    const flagKey = NOTIF_KEY_PREFIX + todayStr;

    async function checkAndNotify() {
      if (!("Notification" in window)) return;
      if (localStorage.getItem(flagKey)) return;

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (cancelled) return;
      if (Notification.permission !== "granted") return;

      // Wait until tasks have actually loaded at least once.
      const current = tasksRef.current;
      if (current.length === 0) return;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const pad = (n: number) => String(n).padStart(2, "0");
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

      const dday = current.filter(
        (t) => t.due_date === todayStr && t.status !== "submitted"
      );
      const d1 = current.filter(
        (t) => t.due_date === tomorrowStr && t.status !== "submitted"
      );
      const overdue = current.filter(
        (t) => t.due_date && t.due_date < todayStr && t.status !== "submitted"
      );

      if (dday.length > 0) {
        new Notification("⚠️ 오늘 마감", {
          body: dday.map((t) => `• ${t.title}`).join("\n"),
        });
      }
      if (d1.length > 0) {
        new Notification("📌 내일 마감", {
          body: d1.map((t) => `• ${t.title}`).join("\n"),
        });
      }
      if (overdue.length > 0) {
        new Notification("🚨 기한 초과", {
          body: `${overdue.length}건의 업무가 기한을 초과했습니다.`,
        });
      }

      localStorage.setItem(flagKey, "1");
    }

    // Defer slightly so the first task fetch has a chance to populate.
    const timer = setTimeout(checkAndNotify, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
}
