import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PRIORITIES, LABELS } from "../types";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
}

function getDueLabel(due_date: string | null): { text: string; className: string } | null {
  if (!due_date) return null;
  const diff = Math.ceil((new Date(due_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (diff < 0) return { text: `D+${Math.abs(diff)} 지남`, className: "text-red-400" };
  if (diff === 0) return { text: "D-day", className: "text-red-400" };
  if (diff === 1) return { text: "D-1", className: "text-orange-400" };
  return { text: due_date.slice(5), className: "text-slate-500" };
}

export function TaskCard({ task, onClick, onArchive, onDuplicate }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : task.status === "submitted" ? 0.7 : 1,
  };

  const priorityInfo = PRIORITIES.find((p) => p.key === task.priority);
  const labelInfo = task.label ? LABELS.find((l) => l.key === task.label) : null;
  const dueLabel = getDueLabel(task.due_date);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="glass-card rounded-lg p-3 mb-2.5 cursor-grab active:cursor-grabbing"
    >
      <div className="text-sm font-medium text-slate-200 mb-2">{task.title}</div>
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-2 py-0.5 font-semibold ${priorityInfo?.color}`}>
            {priorityInfo?.label}
          </span>
          {labelInfo && (
            <span className={`rounded px-2 py-0.5 font-semibold ${labelInfo.color}`}>
              {labelInfo.label}
            </span>
          )}
        </div>
        {dueLabel && (
          <span className={dueLabel.className}>
            {dueLabel.text}
            {task.start_time && (
              <span className="ml-1 text-slate-500">
                {task.start_time}{task.end_time ? `~${task.end_time}` : ""}
              </span>
            )}
          </span>
        )}
      </div>
      {task.description && (
        <div className="text-xs text-slate-500 mt-1.5 line-clamp-2">{task.description}</div>
      )}
      <div className="flex items-center mt-2">
        {onDuplicate && (
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="text-[10px] text-slate-500 hover:text-slate-300 mr-2"
          >
            📋 복제
          </button>
        )}
        {task.status === "submitted" && onArchive && (
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            className="text-[10px] text-slate-500 hover:text-slate-300"
          >
            📦 아카이브
          </button>
        )}
      </div>
    </div>
  );
}
