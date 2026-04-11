import { useState, useEffect, useRef, useCallback } from "react";

interface TitleBarProps {
  onArchiveClick: () => void;
  onStatsClick: () => void;
  onRecurringClick: () => void;
  onTemplateClick: () => void;
  theme: string;
  onToggleTheme: () => void;
  onBackup: () => void;
  onRestore: (jsonData: string) => void;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = DAYS[date.getDay()];
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}년 ${m}월 ${d}일 (${day})  ${h}:${min}`;
}

type MenuId = "theme" | "backup" | "restore" | "recurring" | "templates" | "stats" | "archive";
const DEFAULT_ORDER: MenuId[] = ["theme", "backup", "restore", "recurring", "templates", "stats", "archive"];

function loadOrder(): MenuId[] {
  try {
    const saved = localStorage.getItem("kanban-menu-order");
    if (saved) {
      const parsed = JSON.parse(saved) as MenuId[];
      const all = new Set(DEFAULT_ORDER);
      const valid = parsed.filter(id => all.has(id));
      const missing = DEFAULT_ORDER.filter(id => !valid.includes(id));
      return [...valid, ...missing];
    }
  } catch {}
  return [...DEFAULT_ORDER];
}

const REGIONS: { name: string; lat: number; lon: number }[] = [
  { name: "인천", lat: 37.4563, lon: 126.7052 },
  { name: "서울", lat: 37.5665, lon: 126.9780 },
  { name: "부산", lat: 35.1796, lon: 129.0756 },
  { name: "대구", lat: 35.8714, lon: 128.6014 },
  { name: "대전", lat: 36.3504, lon: 127.3845 },
  { name: "광주", lat: 35.1595, lon: 126.8526 },
  { name: "울산", lat: 35.5384, lon: 129.3114 },
  { name: "수원", lat: 37.2636, lon: 127.0286 },
  { name: "성남", lat: 37.4200, lon: 127.1266 },
  { name: "고양", lat: 37.6584, lon: 126.8320 },
];

function loadRegion(): { name: string; lat: number; lon: number } {
  try {
    const saved = localStorage.getItem("kanban-weather-region");
    if (saved) return JSON.parse(saved);
  } catch {}
  return REGIONS[0]; // 인천 기본
}

export function TitleBar({ onArchiveClick, onStatsClick, onRecurringClick, onTemplateClick, theme, onToggleTheme, onBackup, onRestore }: TitleBarProps) {
  const [now, setNow] = useState(new Date());
  const [menuOrder, setMenuOrder] = useState<MenuId[]>(loadOrder);
  const [editing, setEditing] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [weather, setWeather] = useState<{ temp: string; desc: string } | null>(null);
  const [region, setRegion] = useState(loadRegion);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;

    const descMap: Record<number, string> = {
      0: "맑음 ☀️", 1: "구름 조금 🌤️", 2: "구름 조금 🌤️", 3: "흐림 ☁️",
      45: "안개 🌫️", 48: "안개 🌫️", 51: "이슬비 🌦️", 53: "이슬비 🌦️", 55: "이슬비 🌦️",
      61: "비 🌧️", 63: "비 🌧️", 65: "비 🌧️", 66: "눈비 🌨️", 67: "눈비 🌨️",
      71: "눈 ❄️", 73: "눈 ❄️", 75: "눈 ❄️", 77: "눈 ❄️",
      80: "소나기 🌧️", 81: "소나기 🌧️", 82: "소나기 🌧️",
      85: "눈보라 ❄️", 86: "눈보라 ❄️", 95: "뇌우 ⛈️", 96: "뇌우 ⛈️", 99: "뇌우 ⛈️",
    };

    const fetchWeather = async () => {
      if (document.hidden) return;
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Seoul`;
        const res = await fetch(url, { signal: controller.signal });
        const body = await res.json();
        const current = body.current;
        const temp = Math.round(current.temperature_2m ?? 0);
        const code = current.weather_code ?? 0;
        setWeather({ temp: `${temp}°C`, desc: descMap[code] || "알 수 없음" });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          /* network error: keep stale weather */
        }
      }
    };

    const onVisibility = () => { if (!document.hidden) fetchWeather(); };

    fetchWeather();
    timer = window.setInterval(fetchWeather, 1800000);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      controller.abort();
      if (timer !== undefined) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [region]);

  const changeRegion = (name: string) => {
    const r = REGIONS.find(r => r.name === name);
    if (r) {
      setRegion(r);
      localStorage.setItem("kanban-weather-region", JSON.stringify(r));
    }
  };

  const persistOrder = useCallback((order: MenuId[]) => {
    localStorage.setItem("kanban-menu-order", JSON.stringify(order));
  }, []);

  const handleRestoreClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") onRestore(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Pointer-based menu drag (HTML5 drag conflicts with DndContext)
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragActive = useRef(false);
  const dragIdxRef = useRef<number | null>(null);
  const menuOrderRef = useRef(menuOrder);
  menuOrderRef.current = menuOrder;

  const handlePointerDown = useCallback((idx: number, e: React.PointerEvent) => {
    if (!editing) return;
    e.preventDefault();
    setDragIdx(idx);
    dragIdxRef.current = idx;
    dragStartX.current = e.clientX;
    dragActive.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [editing]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIdxRef.current === null || !editing) return;
    e.preventDefault();
    if (!dragActive.current && Math.abs(e.clientX - dragStartX.current) > 4) {
      dragActive.current = true;
    }
    if (!dragActive.current) return;

    const container = menuContainerRef.current;
    if (!container) return;
    const children = Array.from(container.children).filter(c => c.hasAttribute('data-menu-idx'));
    const currentIdx = dragIdxRef.current;
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && i !== currentIdx) {
        const newOrder = [...menuOrderRef.current];
        const [moved] = newOrder.splice(currentIdx, 1);
        newOrder.splice(i, 0, moved);
        menuOrderRef.current = newOrder;
        setMenuOrder(newOrder);
        setDragIdx(i);
        dragIdxRef.current = i;
        break;
      }
    }
  }, [editing]);

  const handlePointerUp = useCallback(() => {
    if (dragActive.current) {
      persistOrder(menuOrderRef.current);
    }
    setDragIdx(null);
    dragIdxRef.current = null;
    dragActive.current = false;
  }, [persistOrder]);

  const btnClass = "text-xs text-slate-400 hover:text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-md px-3 py-1.5 transition-colors";

  const menuLabels: Record<MenuId, string> = {
    theme: theme === "dark" ? "☀️ 모드" : "🌙 모드",
    backup: "💾 백업",
    restore: "📂 복원",
    recurring: "🔁 반복",
    templates: "📋 템플릿",
    stats: "📊 통계",
    archive: "📦 아카이브",
  };

  const menuActions: Record<MenuId, () => void> = {
    theme: onToggleTheme,
    backup: onBackup,
    restore: handleRestoreClick,
    recurring: onRecurringClick,
    templates: onTemplateClick,
    stats: onStatsClick,
    archive: onArchiveClick,
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400 font-medium">업무 칸반</span>
        <span className="text-sm text-slate-500">{formatDateTime(now)}</span>
        {weather && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{weather.desc} {weather.temp}</span>
            <select
              value={region.name}
              onChange={(e) => changeRegion(e.target.value)}
              className="bg-transparent text-[10px] text-slate-500 outline-none cursor-pointer"
            >
              {REGIONS.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div ref={menuContainerRef} className="flex items-center gap-2">
        {menuOrder.map((id, idx) => (
          <div
            key={id}
            data-menu-idx={idx}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onPointerDown={(e) => handlePointerDown(idx, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`${editing ? "cursor-grab active:cursor-grabbing touch-none select-none" : ""} ${dragIdx === idx ? "opacity-30" : ""}`}
          >
            <span
              onClick={editing ? undefined : menuActions[id]}
              className={`inline-block select-none ${btnClass} cursor-pointer ${editing ? "pointer-events-none ring-1 ring-indigo-500/30 ring-offset-1 ring-offset-transparent" : ""}`}
            >
              {menuLabels[id]}
            </span>
          </div>
        ))}
        <button
          onClick={() => setEditing(!editing)}
          className={`text-xs rounded-md px-2 py-1.5 transition-colors ${editing ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/30" : "text-slate-600 hover:text-slate-400"}`}
          title="메뉴 순서 편집"
        >
          ⚙
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
