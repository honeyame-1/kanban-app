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

export function Column({ status, label, icon, tasks, onTaskClick, onArchive, onDuplicate, isOver }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });

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
        {tasks.length === 0 && (
          <div className="text-center text-xs text-slate-600 py-8">카드 없음</div>
        )}
      </div>
    </div>
  );
}
