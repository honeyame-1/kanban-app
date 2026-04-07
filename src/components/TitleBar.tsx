import { useState, useEffect, useRef, useCallback } from "react";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";

interface TitleBarProps {
  onArchiveClick: () => void;
  onStatsClick: () => void;
  onRecurringClick: () => void;
  theme: string;
  onToggleTheme: () => void;
  onBackup: () => void;
  onRestore: (jsonData: string) => void;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = DAYS[date.getDay()];
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}년 ${m}월 ${d}일 (${day})  ${h}:${min}`;
}

type MenuId = "autostart" | "theme" | "backup" | "restore" | "recurring" | "stats" | "archive";

const DEFAULT_ORDER: MenuId[] = ["autostart", "theme", "backup", "restore", "recurring", "stats", "archive"];

function loadOrder(): MenuId[] {
  try {
    const saved = localStorage.getItem("kanban-menu-order");
    if (saved) {
      const parsed = JSON.parse(saved) as MenuId[];
      // Ensure all items present
      const all = new Set(DEFAULT_ORDER);
      const valid = parsed.filter(id => all.has(id));
      const missing = DEFAULT_ORDER.filter(id => !valid.includes(id));
      return [...valid, ...missing];
    }
  } catch {}
  return [...DEFAULT_ORDER];
}

export function TitleBar({ onArchiveClick, onStatsClick, onRecurringClick, theme, onToggleTheme, onBackup, onRestore }: TitleBarProps) {
  const [now, setNow] = useState(new Date());
  const [autoStart, setAutoStart] = useState(false);
  const [menuOrder, setMenuOrder] = useState<MenuId[]>(loadOrder);
  const [dragItem, setDragItem] = useState<MenuId | null>(null);
  const [dragOver, setDragOver] = useState<MenuId | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    isEnabled().then(setAutoStart).catch(() => {});
    return () => clearInterval(timer);
  }, []);

  const saveOrder = useCallback((order: MenuId[]) => {
    setMenuOrder(order);
    localStorage.setItem("kanban-menu-order", JSON.stringify(order));
  }, []);

  const handleDragStart = (id: MenuId) => {
    setDragItem(id);
  };

  const handleDragOver = (e: React.DragEvent, id: MenuId) => {
    e.preventDefault();
    if (dragItem && dragItem !== id) {
      setDragOver(id);
    }
  };

  const handleDrop = (targetId: MenuId) => {
    if (!dragItem || dragItem === targetId) return;
    const newOrder = [...menuOrder];
    const fromIdx = newOrder.indexOf(dragItem);
    const toIdx = newOrder.indexOf(targetId);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragItem);
    saveOrder(newOrder);
    setDragItem(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragOver(null);
  };

  const toggleAutoStart = async () => {
    try {
      if (autoStart) {
        await disable();
        setAutoStart(false);
      } else {
        await enable();
        setAutoStart(true);
      }
    } catch (err) {
      console.error("자동시작 설정 실패:", err);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        onRestore(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const btnClass = "text-xs text-slate-400 hover:text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-md px-3 py-1.5 transition-colors cursor-grab active:cursor-grabbing";

  const menuItems: Record<MenuId, React.ReactNode> = {
    autostart: (
      <button onClick={toggleAutoStart}
        className={`text-xs border rounded-md px-3 py-1.5 transition-colors ${autoStart ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : "text-slate-400 hover:text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.1]"}`}
      >
        {autoStart ? "🟢 자동시작" : "⚫ 자동시작"}
      </button>
    ),
    theme: (
      <button onClick={onToggleTheme} className={btnClass}>
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    ),
    backup: (
      <button onClick={onBackup} className={btnClass}>💾 백업</button>
    ),
    restore: (
      <button onClick={handleRestoreClick} className={btnClass}>📂 복원</button>
    ),
    recurring: (
      <button onClick={onRecurringClick} className={btnClass}>🔁 반복</button>
    ),
    stats: (
      <button onClick={onStatsClick} className={btnClass}>📊 통계</button>
    ),
    archive: (
      <button onClick={onArchiveClick} className={btnClass}>📦 아카이브</button>
    ),
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 font-medium">업무 칸반</span>
        <span className="text-sm text-slate-500">{formatDateTime(now)}</span>
      </div>
      <div className="flex items-center gap-2">
        {menuOrder.map((id) => (
          <div
            key={id}
            draggable
            onDragStart={() => handleDragStart(id)}
            onDragOver={(e) => handleDragOver(e, id)}
            onDrop={() => handleDrop(id)}
            onDragEnd={handleDragEnd}
            className={`transition-transform ${dragOver === id ? "scale-110 opacity-70" : ""} ${dragItem === id ? "opacity-40" : ""}`}
          >
            {menuItems[id]}
          </div>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
