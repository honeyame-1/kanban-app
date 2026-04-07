import { useEffect, useState } from "react";
import { api } from "../api";

interface Stats {
  this_month_submitted: number;
  total_active: number;
  total_archived: number;
  overdue: number;
  by_priority: Record<string, number>;
}

interface StatsViewProps {
  onClose: () => void;
}

interface StatCardProps {
  value: number;
  label: string;
  accent: string;
  icon: string;
}

function StatCard({ value, label, accent, icon }: StatCardProps) {
  return (
    <div className={`glass-card rounded-xl p-4 flex flex-col gap-1 border ${accent}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold tabular-nums text-slate-100">{value}</div>
      <div className="text-xs text-slate-400 leading-tight">{label}</div>
    </div>
  );
}

const PRIORITY_META: Record<string, { label: string; icon: string; accent: string }> = {
  urgent: { label: "긴급", icon: "🔴", accent: "border-red-500/30" },
  high:   { label: "높음", icon: "🟠", accent: "border-orange-500/30" },
  normal: { label: "보통", icon: "🟡", accent: "border-yellow-500/30" },
  low:    { label: "낮음", icon: "🔵", accent: "border-blue-500/30" },
};

const PRIORITY_ORDER = ["urgent", "high", "normal", "low"];

export function StatsView({ onClose }: StatsViewProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-xl p-6 w-[480px] max-w-[92vw] flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">📊 통계</h2>
            <p className="text-xs text-slate-500 mt-0.5">{monthLabel} 기준</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {loading && (
          <p className="text-center text-sm text-slate-500 py-6">불러오는 중…</p>
        )}

        {error && (
          <p className="text-center text-sm text-red-400 py-6">오류: {error}</p>
        )}

        {stats && !loading && (
          <>
            {/* Main stat grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                value={stats.this_month_submitted}
                label="이번 달 제출"
                icon="✅"
                accent="border-emerald-500/30"
              />
              <StatCard
                value={stats.total_active}
                label="활성 카드"
                icon="📋"
                accent="border-indigo-500/30"
              />
              <StatCard
                value={stats.total_archived}
                label="아카이브"
                icon="📦"
                accent="border-slate-500/30"
              />
              <StatCard
                value={stats.overdue}
                label="기한 초과"
                icon="⚠️"
                accent={stats.overdue > 0 ? "border-red-500/40" : "border-slate-500/30"}
              />
            </div>

            {/* Priority breakdown */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">우선순위별 활성 카드</p>
              <div className="grid grid-cols-4 gap-2">
                {PRIORITY_ORDER.map((key) => {
                  const meta = PRIORITY_META[key];
                  const count = stats.by_priority[key] ?? 0;
                  return (
                    <div
                      key={key}
                      className={`glass-card rounded-lg p-3 text-center border ${meta.accent}`}
                    >
                      <div className="text-base mb-1">{meta.icon}</div>
                      <div className="text-lg font-bold tabular-nums text-slate-100">{count}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{meta.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
