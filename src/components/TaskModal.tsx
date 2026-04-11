import { useState, useEffect, useRef } from "react";
import { PRIORITIES, LABELS } from "../types";
import type { Priority, ChecklistItem, Attachment, ChecklistTemplate } from "../types";
import { api } from "../api";

interface TaskModalProps {
  task: { id?: number; title: string; description: string; priority: string; due_date: string | null; label?: string; start_time?: string | null; end_time?: string | null } | null;
  onSave: (input: { title: string; description?: string; priority?: Priority; due_date?: string; label?: string; start_time?: string; end_time?: string }) => void;
  onClose: () => void;
}

export function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState<Priority>((task?.priority as Priority) || "normal");
  const [dueDate, setDueDate] = useState(task?.due_date || "");
  const [label, setLabel] = useState(task?.label || "");
  const [startTime, setStartTime] = useState(task?.start_time || "");
  const [endTime, setEndTime] = useState(task?.end_time || "");
  const [checkItems, setCheckItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!task || task.id === undefined) return;
    const taskId = task.id;
    let cancelled = false;
    api.getChecklist(taskId).then((items) => {
      if (!cancelled) setCheckItems(items);
    });
    api.getAttachments(taskId).then((items) => {
      if (!cancelled) setAttachments(items);
    });
    api.getChecklistTemplates().then((tpls) => {
      if (!cancelled) setTemplates(tpls);
    });
    return () => { cancelled = true; };
  }, [task]);

  const applyTemplate = async (tplId: number) => {
    if (!task || task.id === undefined) return;
    const newItems = await api.applyChecklistTemplate(task.id, tplId);
    setCheckItems((prev) => [...prev, ...newItems]);
    setShowTemplateMenu(false);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "📄";
    if (["xlsx", "xls"].includes(ext)) return "📊";
    if (["hwpx", "hwp"].includes(ext)) return "📝";
    if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "🖼️";
    if (["doc", "docx"].includes(ext)) return "📃";
    return "📎";
  };

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const taskId = task?.id;
    if (taskId === undefined) return;

    for (const file of Array.from(files)) {
      const att = await api.addAttachment(taskId, file.name, file, file.type);
      setAttachments((prev) => [...prev, att]);
    }
    e.target.value = "";
  };

  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  // 브라우저 기본 동작(파일 열기/새로고침) 차단 — 네이티브 이벤트로 처리
  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // 폼 영역 드롭 시 파일 첨부
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const taskId = task?.id;

    const onEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.types.includes("Files")) setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => { e.preventDefault(); };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      dragCounter.current = 0;
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0 || taskId === undefined) return;
      for (const file of Array.from(files)) {
        const att = await api.addAttachment(taskId, file.name, file, file.type);
        setAttachments((prev) => [...prev, att]);
      }
    };

    form.addEventListener("dragenter", onEnter);
    form.addEventListener("dragleave", onLeave);
    form.addEventListener("dragover", onOver);
    form.addEventListener("drop", onDrop);
    return () => {
      form.removeEventListener("dragenter", onEnter);
      form.removeEventListener("dragleave", onLeave);
      form.removeEventListener("dragover", onOver);
      form.removeEventListener("drop", onDrop);
    };
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || undefined,
      label: label || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <form
        ref={formRef}
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

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">시작 시간</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">종료 시간</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        <label className="block text-xs text-slate-400 mb-1">메모</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50 mb-4 resize-none"
          placeholder="메모 (선택)"
        />

        {task && task.id !== undefined && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-slate-400">체크리스트</label>
              {templates.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <span>📋</span>
                    <span>템플릿</span>
                  </button>
                  {showTemplateMenu && (
                    <>
                      <div className="fixed inset-0 z-[9]" onClick={() => setShowTemplateMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-[#1e1e2e] border border-white/[0.1] rounded-lg shadow-xl z-10 min-w-[160px] py-1">
                        {templates.map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => applyTemplate(tpl.id)}
                            className="w-full text-left text-xs text-slate-300 hover:bg-white/[0.06] px-3 py-2 transition-colors"
                          >
                            {tpl.name}
                            <span className="text-slate-600 ml-1">({tpl.items.length})</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
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
                if (e.key === "Enter" && newItemText.trim() && task?.id !== undefined) {
                  e.preventDefault();
                  const item = await api.addChecklistItem(task.id, newItemText.trim());
                  setCheckItems(prev => [...prev, item]);
                  setNewItemText("");
                }
              }}
              placeholder="항목 추가 (Enter)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40 mt-2 transition-colors"
            />
          </div>
        )}

        {task && task.id !== undefined && (
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
                      onClick={() => api.openAttachment(att.id)}
                      className="text-xs text-slate-300 hover:text-indigo-300 flex-1 text-left truncate transition-colors"
                      title={att.file_name}
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
            <div
              onClick={handleAttach}
              className={`mt-2 border border-dashed rounded-lg px-3 py-3 text-center text-xs cursor-pointer transition-colors ${
                dragging
                  ? "border-indigo-400 bg-indigo-500/10 text-indigo-300"
                  : "border-white/[0.1] text-slate-600 hover:border-white/[0.2] hover:text-slate-500"
              }`}
            >
              {dragging ? "여기에 놓으세요" : "파일을 드래그하거나 클릭하여 첨부"}
            </div>
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelected}
        />
      </form>
    </div>
  );
}
