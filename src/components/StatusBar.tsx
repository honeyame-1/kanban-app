import { useState } from "react";
import type { Task } from "../types";

interface StatusBarProps {
  tasks: Task[];
  urgentCount: number;
  urgentTasks: Task[];
}

const LUNCH_MENUS = [
  // A구역 근처 맛집
  "황기순 칼국수&왕돈까스", "구면구면 메밀국수", "대부도 바지락칼국수",
  "부암갈비", "참치Jo", "복생원 짜장면", "서도일식 참치",
  "간석 고추장 고기", "삼화정 꽃등심", "피자캣",
  // 일반 메뉴
  "김치찌개", "된장찌개", "부대찌개", "순두부찌개",
  "비빔밥", "제육볶음", "김치볶음밥", "돈까스",
  "짜장면", "짬뽕", "탕수육", "칼국수",
  "냉면", "삼겹살", "치킨", "피자",
  "쌀국수", "카레", "우동", "라멘",
  "샌드위치", "햄버거", "닭갈비", "불고기",
  "갈비탕", "설렁탕", "순대국", "떡볶이",
  "콩국수", "냉메밀", "훈제오리", "국밥",
  "백반", "초밥", "덮밥", "볶음밥",
  "김밥", "쫄면", "비빔냉면", "육개장",
  "감자탕", "닭볶음탕", "해물탕", "곱창",
  "족발", "보쌈", "수제비", "만두국",
];

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
  if (count >= 3) return `오늘 ${count}개 처리! ${CHEERS[count % CHEERS.length]}`;
  return `오늘 ${count}개 처리! 잘하고 있어요! 👍`;
}

export function StatusBar({ tasks, urgentCount, urgentTasks }: StatusBarProps) {
  const [lunchOffset, setLunchOffset] = useState(0);
  const [showUrgent, setShowUrgent] = useState(false);

  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const submitted = tasks.filter((t) => t.status === "submitted").length;

  const today = new Date().toISOString().slice(0, 10);
  const todayCompleted = tasks.filter(
    (t) => t.status === "submitted" && t.updated_at?.slice(0, 10) === today
  ).length;

  const cheer = getCheer(todayCompleted);

  const todayIdx = new Date().getDate() + new Date().getMonth() * 31;
  const todayMenu = LUNCH_MENUS[(todayIdx + lunchOffset) % LUNCH_MENUS.length];

  return (
    <div className="flex items-center justify-between px-5 py-2 border-t border-white/[0.06] text-[15px] text-slate-500">
      <span>전체 {tasks.length}개 | 할일 {todo} · 진행중 {inProgress} · 제출완료 {submitted}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setLunchOffset((prev) => prev + 1)}
          className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none"
          title="클릭하면 다른 메뉴 추천"
        >
          🍽️ 오늘 점심: {todayMenu}
        </button>
        {cheer && <span className="text-emerald-400">{cheer}</span>}
        {urgentCount > 0 && (
          <div className="relative">
            <span
              className="text-orange-400 cursor-pointer hover:text-orange-300 transition-colors"
              onClick={() => setShowUrgent(!showUrgent)}
            >
              ⚠ 마감 임박: {urgentCount}건
            </span>
            {showUrgent && urgentTasks.length > 0 && (
              <div className="absolute bottom-full right-0 mb-2 glass rounded-lg p-3 min-w-[250px] shadow-lg">
                <div className="text-xs font-semibold text-slate-300 mb-2">마감 임박 업무</div>
                {urgentTasks.map(t => (
                  <div key={t.id} className="text-xs text-slate-400 py-1 border-b border-white/[0.05] last:border-0">
                    <span className="text-slate-200">{t.title}</span>
                    <span className="ml-2 text-orange-400">{t.due_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
