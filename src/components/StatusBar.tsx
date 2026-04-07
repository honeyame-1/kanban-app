import type { Task } from "../types";

interface StatusBarProps {
  tasks: Task[];
  urgentCount: number;
}

const CHEERS = [
  "오늘도 수고했어요! 💪",
  "잘하고 있어요! 👏",
  "대단해요! 이 기세로! 🔥",
  "멋져요! 오늘 하루도 화이팅! ✨",
  "훌륭해요! 한 걸음씩 나아가고 있어요! 🚀",
];

function getCheer(count: number): string {
  if (count === 0) return "";
  if (count >= 5) return `오늘 ${count}개나 처리했어요! 정말 대단해요! 🏆`;
  if (count >= 3) return `오늘 ${count}개 처리! ${CHEERS[Math.floor(Math.random() * CHEERS.length)]}`;
  return `오늘 ${count}개 처리! 잘하고 있어요! 👍`;
}

export function StatusBar({ tasks, urgentCount }: StatusBarProps) {
  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const submitted = tasks.filter((t) => t.status === "submitted").length;

  const today = new Date().toISOString().slice(0, 10);
  const todayCompleted = tasks.filter(
    (t) => t.status === "submitted" && t.updated_at?.slice(0, 10) === today
  ).length;

  const cheer = getCheer(todayCompleted);

  return (
    <div className="flex items-center justify-between px-5 py-2 border-t border-white/[0.06] text-[15px] text-slate-500">
      <span>전체 {tasks.length}개 | 할일 {todo} · 진행중 {inProgress} · 제출완료 {submitted}</span>
      <div className="flex items-center gap-4">
        {cheer && <span className="text-emerald-400">{cheer}</span>}
        {urgentCount > 0 && (
          <span className="text-orange-400">⚠ 마감 임박: {urgentCount}건</span>
        )}
      </div>
    </div>
  );
}
