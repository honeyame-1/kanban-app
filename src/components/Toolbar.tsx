import { useEffect, useRef, useState } from "react";
import { PRIORITIES, LABELS } from "../types";
import type { GetTasksFilter, Priority } from "../types";

interface ToolbarProps {
  filter: GetTasksFilter;
  onFilterChange: (filter: GetTasksFilter) => void;
  onNewTask: () => void;
}

export function Toolbar({ filter, onFilterChange, onNewTask }: ToolbarProps) {
  // Local search state so typing doesn't refire the Dexie query on every keystroke.
  const [searchInput, setSearchInput] = useState(filter.search || "");
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = searchInput.trim() || undefined;
      if (next !== filterRef.current.search) {
        onFilterChange({ ...filterRef.current, search: next });
      }
    }, 180);
    return () => clearTimeout(id);
  }, [searchInput, onFilterChange]);

  // Keep local input in sync if filter is reset externally.
  useEffect(() => {
    if ((filter.search || "") !== searchInput) {
      setSearchInput(filter.search || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.search]);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="🔍 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 w-56 outline-none focus:border-indigo-500/50"
        />
        <select
          value={filter.priority || ""}
          onChange={(e) => onFilterChange({ ...filter, priority: (e.target.value || undefined) as Priority | undefined })}
          className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none"
        >
          <option value="">우선순위 전체</option>
          {PRIORITIES.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <select
          value={filter.label || ""}
          onChange={(e) => onFilterChange({ ...filter, label: e.target.value || undefined })}
          className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none"
        >
          <option value="">라벨 전체</option>
          {LABELS.map((l) => (
            <option key={l.key} value={l.key}>{l.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={filter.due_date_until || ""}
          onChange={(e) => onFilterChange({ ...filter, due_filter: undefined, due_date_until: e.target.value || undefined })}
          className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500/50"
        />
        <select
          value={filter.due_filter || "all"}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "all") {
              onFilterChange({ ...filter, due_filter: undefined, due_date_until: undefined });
            } else {
              onFilterChange({ ...filter, due_filter: val as "today" | "week" | "next_week", due_date_until: undefined });
            }
          }}
          className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none"
        >
          <option value="all">마감일 전체</option>
          <option value="today">오늘까지</option>
          <option value="week">이번주</option>
          <option value="next_week">다음주까지</option>
        </select>
        <button
          onClick={onNewTask}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
        >
          + 새 카드
        </button>
      </div>
    </div>
  );
}
