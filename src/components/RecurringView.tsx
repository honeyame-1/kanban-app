import { useState, useEffect } from "react";
import { api } from "../api";
import { PRIORITIES, LABELS, DAYS_OF_WEEK } from "../types";
import type { RecurringTask, Priority, Recurrence } from "../types";

interface RecurringViewProps {
  onClose: () => void;
  onGenerated: () => void;
}

export function RecurringView({ onClose, onGenerated }: RecurringViewProps) {
  const [items, setItems] = useState<RecurringTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [label, setLabel] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(3); // 목요일
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [autoDueDays, setAutoDueDays] = useState<number>(0);

  const fetchItems = async () => {
    const data = await api.getRecurringTasks();
    setItems(data);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    await api.createRecurringTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      label: label || undefined,
      recurrence,
      day_of_week: recurrence === "weekly" ? dayOfWeek : undefined,
      day_of_month: recurrence === "monthly" ? dayOfMonth : undefined,
      auto_due_days: autoDueDays || undefined,
    });
    setTitle("");
    setDescription("");
    setPriority("normal");
    setLabel("");
    setShowForm(false);
    fetchItems();
  };

  const handleGenerate = async () => {
    const count = await api.generateRecurringTasks();
    if (count > 0) {
      onGenerated();
    }
    alert(count > 0 ? `${count}개의 반복 카드가 생성되었습니다!` : "오늘 생성할 반복 카드가 없습니다.");
  };

  const recurrenceLabel = (rt: RecurringTask) => {
    switch (rt.recurrence) {
      case "daily": return "매일";
      case "weekly": return `매주 ${DAYS_OF_WEEK[rt.day_of_week ?? 0]}요일`;
      case "monthly": return `매월 ${rt.day_of_month ?? 1}일`;
      default: return rt.recurrence;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass rounded-xl p-6 w-[560px] max-w-[90vw] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">🔁 반복 업무 관리</h2>
          <div className="flex gap-2">
            <button onClick={handleGenerate} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-3 py-1.5">
              ▶ 오늘 카드 생성
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 && !showForm && (
            <p className="text-center text-sm text-slate-500 py-8">등록된 반복 업무가 없습니다</p>
          )}

          {items.map((rt) => {
            const priorityInfo = PRIORITIES.find(p => p.key === rt.priority);
            const labelInfo = LABELS.find(l => l.key === rt.label);
            return (
              <div key={rt.id} className={`glass-card rounded-lg p-3 mb-2 ${!rt.enabled ? "opacity-40" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-200">{rt.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="text-slate-400">{recurrenceLabel(rt)}</span>
                      {priorityInfo && <span className={`rounded px-1.5 py-0.5 ${priorityInfo.color}`}>{priorityInfo.label}</span>}
                      {labelInfo && <span className={`rounded px-1.5 py-0.5 ${labelInfo.color}`}>{labelInfo.label}</span>}
                      {rt.auto_due_days > 0 && <span className="text-slate-500">마감: +{rt.auto_due_days}일</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button onClick={async () => { await api.toggleRecurringTask(rt.id); fetchItems(); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded px-2 py-1">
                      {rt.enabled ? "비활성" : "활성"}
                    </button>
                    <button onClick={async () => { await api.deleteRecurringTask(rt.id); fetchItems(); }}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded px-2 py-1">
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {showForm ? (
            <div className="glass-card rounded-lg p-4 mt-2">
              <div className="text-sm font-medium text-slate-200 mb-3">새 반복 업무</div>

              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 *"
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none mb-2" />

              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)"
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none mb-2" />

              <div className="flex gap-2 mb-2">
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                  className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none">
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                </select>

                {recurrence === "weekly" && (
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none">
                    {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                  </select>
                )}

                {recurrence === "monthly" && (
                  <select value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none">
                    {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}일</option>)}
                  </select>
                )}
              </div>

              <div className="flex gap-2 mb-2">
                <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
                  className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none">
                  {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
                <select value={label} onChange={(e) => setLabel(e.target.value)}
                  className="bg-white/[0.06] border border-white/[0.1] rounded-md px-3 py-2 text-xs text-slate-300 outline-none">
                  <option value="">라벨 없음</option>
                  {LABELS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">마감</span>
                  <input type="number" min={0} max={30} value={autoDueDays}
                    onChange={(e) => setAutoDueDays(Number(e.target.value))}
                    className="w-14 bg-white/[0.06] border border-white/[0.1] rounded-md px-2 py-2 text-xs text-slate-300 outline-none" />
                  <span className="text-xs text-slate-400">일후</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1">취소</button>
                <button onClick={handleCreate} disabled={!title.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-md px-4 py-2">
                  등록
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="w-full mt-2 border border-dashed border-white/[0.1] hover:border-white/[0.2] rounded-lg py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              + 반복 업무 추가
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
