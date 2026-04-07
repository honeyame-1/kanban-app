import { PRIORITIES } from "../types";
import type { GetTasksFilter, Priority } from "../types";

interface ToolbarProps {
  filter: GetTasksFilter;
  onFilterChange: (filter: GetTasksFilter) => void;
  onNewTask: () => void;
}

export function Toolbar({ filter, onFilterChange, onNewTask }: ToolbarProps) {
  const dueSelectValue = filter.due_date_until !== undefined ? "custom" : (filter.due_filter || "all");

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="🔍 검색..."
          value={filter.search || ""}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value || undefined })}
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
          value={dueSelectValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "all") {
              onFilterChange({ ...filter, due_filter: undefined, due_date_until: undefined });
            } else if (val === "custom") {
              onFilterChange({ ...filter, due_filter: undefined, due_date_until: filter.due_date_until || "" });
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
          <option value="custom">날짜 선택</option>
        </select>
        {dueSelectValue === "custom" && (
          <input
            type="date"
            value={filter.due_date_until || ""}
            onChange={(e) => onFilterChange({ ...filter, due_filter: undefined, due_date_until: e.target.value || undefined })}
            className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none"
          />
        )}
      </div>
      <button
        onClick={onNewTask}
        className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
      >
        + 새 카드
      </button>
    </div>
  );
}
