import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { PRIORITIES, LABELS } from "../types";
import type { Priority, ChecklistItem, Attachment } from "../types";
import { api } from "../api";

interface TaskModalProps {
  task: { id?: number; title: string; description: string; priority: string; due_date: string | null; label?: string } | null;
  onSave: (input: { title: string; description?: string; priority?: Priority; due_date?: string; label?: string }) => void;
  onClose: () => void;
}

export function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<Priority>((task?.priority as Priority) || "normal");
  const [dueDate, setDueDate] = useState(task?.due_date || "");
  const [label, setLabel] = useState(task?.label || "");
  const [checkItems, setCheckItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (task && 'id' in task) {
      const taskId = task!.id!;
      api.getChecklist(taskId).then(setCheckItems);
      api.getAttachments(taskId).then(setAttachments);
    }
  }, [task]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "📄";
    if (["xlsx", "xls"].includes(ext)) return "📊";
    if (["hwpx", "hwp"].includes(ext)) return "📝";
    if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "🖼️";
    if (["doc", "docx"].includes(ext)) return "📃";
    return "📎";
  };

  const handleAttach = async () => {
    const result = await open({
      multiple: true,
      filters: [{ name: "All Files", extensions: ["*"] }],
    });
    if (!result) return;
    const paths = Array.isArray(result) ? result : [result];
    const taskId = task!.id!;
    for (const filePath of paths) {
      const fileName = filePath.split(/[\\/]/).pop() || filePath;
      const att = await api.addAttachment(taskId, fileName, filePath);
      setAttachments(prev => [...prev, att]);
    }
  };

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
        className="glass rounded-xl p-6 w-[460px] max-w-[92vw] max-h-[90vh] overflow-y-auto"
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

        {task && 'id' in task && (
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-2">체크리스트</label>
            <div className="space-y-1">
              {checkItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 group px-2 py-1 rounded hover:bg-white/[0.03] transition-colors">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={async () => {
                      await api.toggleChecklistItem(item.id);
                      setCheckItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
                    }}
                    className="accent-indigo-500 w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
                  />
                  <span className={`text-sm flex-1 leading-tight ${item.checked ? "line-through text-slate-600" : "text-slate-300"}`}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.deleteChecklistItem(item.id);
                      setCheckItems(prev => prev.filter(i => i.id !== item.id));
                    }}
                    className="text-xs text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newItemText.trim()) {
                  e.preventDefault();
                  const item = await api.addChecklistItem(task!.id!, newItemText.trim());
                  setCheckItems(prev => [...prev, item]);
                  setNewItemText("");
                }
              }}
              placeholder="항목 추가 (Enter)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40 mt-2 transition-colors"
            />
          </div>
        )}

        {task && 'id' in task && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-slate-400">첨부파일</label>
              <button
                type="button"
                onClick={handleAttach}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <span>📎</span>
                <span>파일 첨부</span>
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 group px-2 py-1.5 rounded hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-sm flex-shrink-0">{getFileIcon(att.file_name)}</span>
                    <button
                      type="button"
                      onClick={() => api.openFile(att.file_path)}
                      className="text-xs text-slate-300 hover:text-indigo-300 flex-1 text-left truncate transition-colors"
                      title={att.file_path}
                    >
                      {att.file_name}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteAttachment(att.id);
                        setAttachments(prev => prev.filter(a => a.id !== att.id));
                      }}
                      className="text-xs text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity leading-none flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {attachments.length === 0 && (
              <p className="text-xs text-slate-600 px-2">첨부된 파일이 없습니다</p>
            )}
          </div>
        )}

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
