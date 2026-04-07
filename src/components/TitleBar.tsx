interface TitleBarProps {
  onArchiveClick: () => void;
}

export function TitleBar({ onArchiveClick }: TitleBarProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-white/[0.03]">
      <span className="text-sm text-slate-400 font-medium">업무 칸반</span>
      <button
        onClick={onArchiveClick}
        className="text-xs text-slate-400 hover:text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-md px-3 py-1.5 transition-colors"
      >
        📦 아카이브
      </button>
    </div>
  );
}
