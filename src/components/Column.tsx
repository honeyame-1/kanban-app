import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import type { Task, Status } from "../types";

interface ColumnProps {
  status: Status;
  label: string;
  icon: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onArchive: (id: number) => void;
  onDuplicate: (task: Task) => void;
  isOver?: boolean;
}

interface MonthGroup {
  key: string;
  label: string;
  tasks: Task[];
}

function groupByMonth(tasks: Task[]): MonthGroup[] {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const d = new Date(t.updated_at || t.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = map.get(key);
    if (list) list.push(t);
    else map.set(key, [t]);
  }
  // 최신 월이 위로
  const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  return sorted.map(([key, tasks]) => {
    const [y, m] = key.split("-");
    return { key, label: `${y}년 ${Number(m)}월`, tasks };
  });
}

function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function Column({ status, label, icon, tasks, onTaskClick, onArchive, onDuplicate, isOver }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const isSubmitted = status === "submitted";
  const groups = isSubmitted ? groupByMonth(tasks) : null;
  const currentMonth = getCurrentMonthKey();

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div ref={setNodeRef} className={`flex-1 glass rounded-xl p-3.5 flex flex-col min-w-0 overflow-hidden transition-colors ${isOver ? "ring-2 ring-indigo-500/50 bg-indigo-500/5" : ""}`}>
      <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          {icon} {label}
          <span className="bg-white/[0.1] rounded-full px-2 py-0.5 text-[11px] text-slate-400">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isSubmitted && groups ? (
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.key);
              const isCurrent = group.key === currentMonth;
              return (
                <div key={group.key} className="mb-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex items-center gap-1.5 w-full text-left px-1.5 py-1.5 rounded hover:bg-white/[0.04] transition-colors group"
                  >
                    <span className={`text-[10px] transition-transform ${isCollapsed ? "" : "rotate-90"}`}>
                      ▶
                    </span>
                    <span className={`text-xs font-medium ${isCurrent ? "text-indigo-400" : "text-slate-500"}`}>
                      {group.label}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {group.tasks.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="mt-1">
                      {group.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => onTaskClick(task)}
                          onArchive={() => onArchive(task.id)}
                          onDuplicate={() => onDuplicate(task)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </SortableContext>
        ) : (
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onArchive={status === "submitted" ? () => onArchive(task.id) : undefined}
                onDuplicate={() => onDuplicate(task)}
              />
            ))}
          </SortableContext>
        )}
        {tasks.length === 0 && (
          <div className="text-center text-xs text-slate-600 py-8">카드 없음</div>
        )}
      </div>
    </div>
  );
}
