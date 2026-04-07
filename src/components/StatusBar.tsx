import { useState } from "react";
import type { Task } from "../types";

interface StatusBarProps {
  tasks: Task[];
  urgentCount: number;
  urgentTasks: Task[];
}

const DEFAULT_LUNCH_MENUS = [
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
  "엄마손맛 순대국밥 + 순대 추가",
  "박가부대 부대찌개 + 라면사리",
  "이민숙의 배부른 김밥 떡볶이 + 튀김 + 순대",
  "이민숙의 배부른 김밥 김밥 + 라면",
  "풍미감자탕 뼈해장국 + 밥",
  "풍미감자탕 감자탕 + 볶음밥",
  "대부도바지락칼국수 바지락칼국수 + 수제비",
  "해중루 짬뽕 + 탕수육",
  "다담밥상 한정식 백반",
  "정담 한식 정식 + 된장찌개",
  "시골낙지 낙지볶음 + 소면",
  "시골낙지 낙지탕탕이 + 밥",
  "뚜껑열린산오징어 회 + 매운탕",
  // B구역 맛집
  "팔당짬뽕 짬뽕 + 주꾸미볶음",
  "팔당짬뽕 짜장면 + 탕수육",
  "할머니추어탕 추어탕 + 돌솥밥",
  "할머니추어탕 통추어탕 + 돌솥밥",
  "할머니추어탕 추어튀김 + 물만두",
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
  "순대국밥 + 순대 추가",
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

function loadMenus(): string[] {
  try {
    const saved = localStorage.getItem("kanban-lunch-menus");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_LUNCH_MENUS];
}

export function StatusBar({ tasks, urgentCount, urgentTasks }: StatusBarProps) {
  const [lunchOffset, setLunchOffset] = useState(0);
  const [showUrgent, setShowUrgent] = useState(false);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [menus, setMenus] = useState<string[]>(loadMenus);
  const [newMenu, setNewMenu] = useState("");

  const saveMenus = (updated: string[]) => {
    setMenus(updated);
    localStorage.setItem("kanban-lunch-menus", JSON.stringify(updated));
  };

  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const submitted = tasks.filter((t) => t.status === "submitted").length;

  const today = new Date().toISOString().slice(0, 10);
  const todayCompleted = tasks.filter(
    (t) => t.status === "submitted" && t.updated_at?.slice(0, 10) === today
  ).length;

  const cheer = getCheer(todayCompleted);

  const todayIdx = new Date().getDate() + new Date().getMonth() * 31;
  const todayMenu = menus.length > 0 ? menus[(todayIdx + lunchOffset) % menus.length] : "메뉴를 추가하세요";

  return (
    <div className="flex items-center justify-between px-5 py-2 border-t border-white/[0.06] text-[15px] text-slate-500">
      <span>전체 {tasks.length}개 | 할일 {todo} · 진행중 {inProgress} · 제출완료 {submitted}</span>
      <div className="flex items-center gap-4">
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLunchOffset((prev) => prev + 1)}
            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none"
            title="클릭하면 다른 메뉴 추천"
          >
            🍽️ 오늘 점심: {todayMenu}
          </button>
          <button
            type="button"
            onClick={() => setShowMenuEditor(!showMenuEditor)}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            title="메뉴 편집"
          >
            ✏️
          </button>
          {showMenuEditor && (
            <div className="absolute bottom-full left-0 mb-2 glass rounded-lg p-4 min-w-[320px] max-h-[400px] shadow-lg z-50 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">점심 메뉴 편집</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { saveMenus([...DEFAULT_LUNCH_MENUS]); }}
                    className="text-[10px] text-slate-500 hover:text-slate-300"
                  >
                    초기화
                  </button>
                  <button onClick={() => setShowMenuEditor(false)} className="text-slate-400 hover:text-slate-200">✕</button>
                </div>
              </div>
              <div className="flex gap-1 mb-2">
                <input
                  value={newMenu}
                  onChange={(e) => setNewMenu(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newMenu.trim()) {
                      saveMenus([...menus, newMenu.trim()]);
                      setNewMenu("");
                    }
                  }}
                  placeholder="새 메뉴 추가 (Enter)"
                  className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded px-2 py-1 text-xs text-slate-300 outline-none"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {menus.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5 group">
                    <span className="text-xs text-slate-400">{m}</span>
                    <button
                      onClick={() => saveMenus(menus.filter((_, idx) => idx !== i))}
                      className="text-[10px] text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-slate-600 mt-2 pt-1 border-t border-white/[0.05]">
                총 {menus.length}개
              </div>
            </div>
          )}
        </div>
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
