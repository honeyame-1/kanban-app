import { useState, useEffect } from "react";

interface TitleBarProps {
  onArchiveClick: () => void;
  theme: string;
  onToggleTheme: () => void;
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

export function TitleBar({ onArchiveClick }: TitleBarProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 font-medium">업무 칸반</span>
        <span className="text-sm text-slate-500">{formatDateTime(now)}</span>
      </div>
      <button
        onClick={onArchiveClick}
        className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-md px-3 py-1.5 transition-colors"
      >
        📦 아카이브
      </button>
    </div>
  );
}
