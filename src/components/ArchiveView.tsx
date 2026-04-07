import type { Task } from "../types";
import { PRIORITIES } from "../types";

interface ArchiveViewProps {
  tasks: Task[];
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function ArchiveView({ tasks, onRestore, onDelete, onClose }: ArchiveViewProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass rounded-xl p-6 w-[520px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">📦 아카이브</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">아카이브된 카드가 없습니다</p>
          ) : (
            tasks.map((task) => {
              const priorityInfo = PRIORITIES.find((p) => p.key === task.priority);
              return (
                <div key={task.id} className="flex items-center justify-between glass-card rounded-lg p-3 mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-300">{task.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      <span className={`${priorityInfo?.color} rounded px-1.5 py-0.5`}>{priorityInfo?.label}</span>
                      {task.due_date && <span className="ml-2">{task.due_date}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => onRestore(task.id)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded px-2 py-1"
                    >
                      복원
                    </button>
                    <button
                      onClick={() => onDelete(task.id)}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded px-2 py-1"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
