import { useState, useEffect } from "react";
import { api } from "../api";
import type { ChecklistTemplate } from "../types";

interface TemplateViewProps {
  onClose: () => void;
}

export function TemplateView({ onClose }: TemplateViewProps) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    api.getChecklistTemplates().then(setTemplates);
  }, []);

  const startNew = () => {
    setIsNew(true);
    setEditingId(null);
    setName("");
    setItemsText("");
  };

  const startEdit = (tpl: ChecklistTemplate) => {
    setIsNew(false);
    setEditingId(tpl.id);
    setName(tpl.name);
    setItemsText(tpl.items.join("\n"));
  };

  const cancel = () => {
    setIsNew(false);
    setEditingId(null);
    setName("");
    setItemsText("");
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const items = itemsText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return;

    if (isNew) {
      const tpl = await api.addChecklistTemplate(trimmedName, items);
      setTemplates((prev) => [...prev, tpl]);
    } else if (editingId !== null) {
      await api.updateChecklistTemplate(editingId, trimmedName, items);
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, name: trimmedName, items } : t))
      );
    }
    cancel();
  };

  const handleDelete = async (id: number) => {
    await api.deleteChecklistTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) cancel();
  };

  const isEditing = isNew || editingId !== null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-xl p-6 w-[500px] max-w-[92vw] max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">체크리스트 템플릿</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg">&times;</button>
        </div>

        {templates.length === 0 && !isEditing && (
          <p className="text-sm text-slate-500 mb-4">등록된 템플릿이 없습니다</p>
        )}

        <div className="space-y-2 mb-4">
          {templates.filter((tpl) => editingId !== tpl.id).map((tpl) => (
            <div
              key={tpl.id}
              className="border rounded-lg px-3 py-2.5 transition-colors border-white/[0.08] hover:border-white/[0.15]"
            >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200">{tpl.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {tpl.items.map((item, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-1 text-slate-700">/</span>}
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(tpl)}
                      className="text-xs text-slate-500 hover:text-indigo-400 px-1.5 py-0.5 transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="text-xs text-slate-500 hover:text-red-400 px-1.5 py-0.5 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
            </div>
          ))}
        </div>

        {isEditing && (
          <div className="border border-white/[0.1] rounded-lg p-3 mb-4 space-y-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="템플릿 이름 (예: 계약의뢰 체크리스트)"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50"
            />
            <div>
              <label className="block text-xs text-slate-400 mb-1">항목 (줄바꿈으로 구분)</label>
              <textarea
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                rows={6}
                placeholder={"견적서 확인\n계약서 검토\n결재 상신\n계약 체결"}
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancel}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={save}
                disabled={!name.trim() || !itemsText.trim()}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-md px-4 py-1.5 transition-colors"
              >
                {isNew ? "추가" : "저장"}
              </button>
            </div>
          </div>
        )}

        {!isEditing && (
          <button
            onClick={startNew}
            className="w-full border border-dashed border-white/[0.1] rounded-lg px-3 py-2.5 text-xs text-slate-500 hover:text-slate-300 hover:border-white/[0.2] transition-colors"
          >
            + 새 템플릿 추가
          </button>
        )}
      </div>
    </div>
  );
}
