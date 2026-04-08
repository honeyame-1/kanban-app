import { useEffect, useRef } from "react";
import type { Task } from "../types";

export function useNotifications(tasks: Task[]) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current || tasks.length === 0) return;
    hasFired.current = true;

    async function checkAndNotify() {
      if (!("Notification" in window)) return;

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission !== "granted") return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStr = today.toISOString().slice(0, 10);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      const dday = tasks.filter(
        (t) => t.due_date === todayStr && t.status !== "submitted"
      );
      const d1 = tasks.filter(
        (t) => t.due_date === tomorrowStr && t.status !== "submitted"
      );
      const overdue = tasks.filter(
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
    }

    checkAndNotify();
  }, [tasks]);
}
