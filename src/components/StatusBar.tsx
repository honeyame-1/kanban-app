import { useState } from "react";
import type { Task } from "../types";

interface StatusBarProps {
  tasks: Task[];
  urgentCount: number;
  urgentTasks: Task[];
}

const LUNCH_MENUS = [
  // A구역 맛집 세트
  "황기순 칼국수 + 왕돈까스",
  "구면구면 메밀국수 + 훈제오리",
  "대부도 바지락칼국수 + 수제비",
  "부암갈비 + 된장찌개",
  "참치Jo 참치회 + 초밥세트",
  "복생원 간짜장 + 탕수육",
  "서도일식 참치덮밥 + 우동",
  "간석 고추장 고기 + 볶음밥",
  "삼화정 꽃등심 + 냉면",
  "피자캣 피자 + 파스타",
  // 중식 세트
  "짜장면 + 탕수육",
  "짬뽕 + 군만두",
  "간짜장 + 깐풍기",
  "볶음밥 + 짬뽕탕",
  // 한식 세트
  "김치찌개 + 계란말이 + 밥",
  "된장찌개 + 제육볶음 + 밥",
  "부대찌개 + 라면사리",
  "순두부찌개 + 공기밥",
  "비빔밥 + 된장국",
  "제육볶음 + 김치전",
  "불고기 + 잡채 + 밥",
  "삼겹살 + 된장찌개 + 쌈",
  "닭갈비 + 볶음밥",
  "보쌈 + 김치 + 쌈",
  "족발 + 막국수",
  // 국/탕 세트
  "갈비탕 + 깍두기",
  "설렁탕 + 깍두기 + 밥",
  "순대국 + 순대 추가",
  "육개장 + 공기밥",
  "감자탕 + 볶음밥",
  "닭볶음탕 + 밥",
  "해물탕 + 소주 한잔",
  "곰탕 + 수육",
  "국밥 + 수육",
  // 분식/간편
  "떡볶이 + 튀김 + 순대",
  "김밥 + 라면",
  "쫄면 + 만두",
  "수제비 + 감자전",
  // 일식/양식
  "돈까스 + 우동",
  "초밥 + 미소시루",
  "라멘 + 교자",
  "카레라이스 + 샐러드",
  "햄버거 + 감자튀김 + 콜라",
  "파스타 + 샐러드",
  // 면류
  "칼국수 + 만두",
  "냉면 + 수육",
  "콩국수 + 보리밥",
  "쌀국수 + 월남쌈",
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
