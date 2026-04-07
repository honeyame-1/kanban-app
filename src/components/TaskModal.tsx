import { useState } from "react";
import { PRIORITIES, LABELS } from "../types";
import type { Priority } from "../types";

interface TaskModalProps {
  task: { title: string; description: string; priority: string; due_date: string | null; label?: string } | null;
  onSave: (input: { title: string; description?: string; priority?: Priority; due_date?: string; label?: string }) => void;
  onClose: () => void;
}

export function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<Priority>((task?.priority as Priority) || "normal");
  const [dueDate, setDueDate] = useState(task?.due_date || "");
  const [label, setLabel] = useState(task?.label || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || undefined,
      label: label || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="glass rounded-xl p-6 w-[420px] max-w-[90vw]"
      >
        <h2 className="text-lg font-semibold mb-4">{task ? "카드 수정" : "새 카드"}</h2>

        <label className="block text-xs text-slate-400 mb-1">제목 *</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50 mb-3"
          placeholder="할 일을 입력하세요"
        />

        <label className="block text-xs text-slate-400 mb-1">우선순위</label>
        <div className="flex gap-2 mb-3">
          {PRIORITIES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPriority(p.key)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                priority === p.key
                  ? `${p.color} border-current`
                  : "border-white/[0.1] text-slate-400 hover:border-white/[0.2]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="block text-xs text-slate-400 mb-1">라벨</label>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={() => setLabel("")}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              label === ""
                ? "bg-white/[0.1] border-white/[0.3] text-slate-200"
                : "border-white/[0.1] text-slate-400 hover:border-white/[0.2]"
            }`}
          >
            없음
          </button>
          {LABELS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLabel(l.key)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                label === l.key
                  ? `${l.color} border-current`
                  : "border-white/[0.1] text-slate-400 hover:border-white/[0.2]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <label className="block text-xs text-slate-400 mb-1">마감일</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50 mb-3"
        />

        <label className="block text-xs text-slate-400 mb-1">메모</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50 mb-4 resize-none"
          placeholder="메모 (선택)"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-200 px-4 py-2"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg px-5 py-2 transition-colors"
          >
            {task ? "수정" : "생성"}
          </button>
        </div>
      </form>
    </div>
  );
}
