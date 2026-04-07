import { useState, useEffect, useRef } from "react";
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
  const [editing, setEditing] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    isEnabled().then(setAutoStart).catch(() => {});
    return () => clearInterval(timer);
  }, []);

  const saveOrder = (order: MenuId[]) => {
    setMenuOrder(order);
    localStorage.setItem("kanban-menu-order", JSON.stringify(order));
  };

  const toggleAutoStart = async () => {
    try {
      if (autoStart) { await disable(); setAutoStart(false); }
      else { await enable(); setAutoStart(true); }
    } catch (err) { console.error("자동시작 설정 실패:", err); }
  };

  const handleRestoreClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") onRestore(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const btnClass = "text-xs text-slate-400 hover:text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-md px-3 py-1.5 transition-colors";

  const menuLabels: Record<MenuId, string> = {
    autostart: autoStart ? "🟢 자동시작" : "⚫ 자동시작",
    theme: theme === "dark" ? "☀️" : "🌙",
    backup: "💾 백업",
    restore: "📂 복원",
    recurring: "🔁 반복",
    stats: "📊 통계",
    archive: "📦 아카이브",
  };

  const menuActions: Record<MenuId, () => void> = {
    autostart: toggleAutoStart,
    theme: onToggleTheme,
    backup: onBackup,
    restore: handleRestoreClick,
    recurring: onRecurringClick,
    stats: onStatsClick,
    archive: onArchiveClick,
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 font-medium">업무 칸반</span>
        <span className="text-sm text-slate-500">{formatDateTime(now)}</span>
      </div>
      <div className="flex items-center gap-2">
        {menuOrder.map((id, idx) => (
          <div
            key={id}
            draggable={editing}
            onDragStart={(e) => {
              if (!editing) return;
              setDragIdx(idx);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (!editing || dragIdx === null) return;
              e.preventDefault();
            }}
            onDrop={() => {
              if (!editing || dragIdx === null || dragIdx === idx) { setDragIdx(null); return; }
              const newOrder = [...menuOrder];
              const [moved] = newOrder.splice(dragIdx, 1);
              newOrder.splice(idx, 0, moved);
              saveOrder(newOrder);
              setDragIdx(null);
            }}
            onDragEnd={() => setDragIdx(null)}
            className={`${editing ? "cursor-grab active:cursor-grabbing" : ""} ${dragIdx === idx ? "opacity-30" : ""}`}
          >
            <span
              onClick={editing ? undefined : menuActions[id]}
              className={`inline-block select-none ${
                id === "autostart" && autoStart
                  ? "text-xs border rounded-md px-3 py-1.5 transition-colors text-emerald-400 bg-emerald-500/10 border-emerald-500/30 cursor-pointer"
                  : `${btnClass} cursor-pointer`
              } ${editing ? "pointer-events-none ring-1 ring-indigo-500/30 ring-offset-1 ring-offset-transparent" : ""}`}
            >
              {menuLabels[id]}
            </span>
          </div>
        ))}
        <button
          onClick={() => setEditing(!editing)}
          className={`text-xs rounded-md px-2 py-1.5 transition-colors ${editing ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/30" : "text-slate-600 hover:text-slate-400"}`}
          title="메뉴 순서 편집"
        >
          ⚙
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
