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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    isEnabled().then(setAutoStart).catch(() => {});
    return () => clearInterval(timer);
  }, []);

  const moveItem = (fromIdx: number, dir: -1 | 1) => {
    const toIdx = fromIdx + dir;
    if (toIdx < 0 || toIdx >= menuOrder.length) return;
    const newOrder = [...menuOrder];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];
    setMenuOrder(newOrder);
    localStorage.setItem("kanban-menu-order", JSON.stringify(newOrder));
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

  const menuItems: Record<MenuId, { label: string; onClick: () => void; custom?: boolean }> = {
    autostart: { label: autoStart ? "🟢 자동시작" : "⚫ 자동시작", onClick: toggleAutoStart, custom: true },
    theme: { label: theme === "dark" ? "☀️" : "🌙", onClick: onToggleTheme },
    backup: { label: "💾 백업", onClick: onBackup },
    restore: { label: "📂 복원", onClick: handleRestoreClick },
    recurring: { label: "🔁 반복", onClick: onRecurringClick },
    stats: { label: "📊 통계", onClick: onStatsClick },
    archive: { label: "📦 아카이브", onClick: onArchiveClick },
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 font-medium">업무 칸반</span>
        <span className="text-sm text-slate-500">{formatDateTime(now)}</span>
      </div>
      <div className="flex items-center gap-2">
        {menuOrder.map((id, idx) => {
          const item = menuItems[id];
          return (
            <div key={id} className="flex items-center gap-0.5">
              {editing && (
                <div className="flex flex-col mr-0.5">
                  <button onClick={() => moveItem(idx, -1)} className="text-[8px] text-slate-600 hover:text-slate-300 leading-none">◀</button>
                  <button onClick={() => moveItem(idx, 1)} className="text-[8px] text-slate-600 hover:text-slate-300 leading-none">▶</button>
                </div>
              )}
              <button
                onClick={editing ? undefined : item.onClick}
                className={id === "autostart" && autoStart
                  ? `text-xs border rounded-md px-3 py-1.5 transition-colors text-emerald-400 bg-emerald-500/10 border-emerald-500/30`
                  : btnClass
                }
              >
                {item.label}
              </button>
            </div>
          );
        })}
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
