import type { Task } from "../types";

interface StatusBarProps {
  tasks: Task[];
  urgentCount: number;
}

export function StatusBar({ tasks, urgentCount }: StatusBarProps) {
  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const submitted = tasks.filter((t) => t.status === "submitted").length;

  return (
    <div className="flex items-center justify-between px-5 py-2 border-t border-white/[0.06] text-[11px] text-slate-500">
      <span>전체 {tasks.length}개 | 할일 {todo} · 진행중 {inProgress} · 제출완료 {submitted}</span>
      {urgentCount > 0 && (
        <span className="text-orange-400">⚠ 마감 임박: {urgentCount}건</span>
      )}
    </div>
  );
}
