# Tauri → 순수 웹앱 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tauri+Rust 백엔드를 제거하고, IndexedDB(Dexie.js)로 교체하여 어떤 PC에서든 브라우저만으로 실행 가능한 순수 웹앱으로 전환한다.

**Architecture:** Rust 백엔드(SQLite, Tauri commands)를 모두 제거하고, `src/db.ts`(Dexie.js)로 IndexedDB 스키마를 정의한다. `src/api.ts`의 모든 `invoke()` 호출을 Dexie 쿼리로 교체한다. 첨부파일은 파일 경로 대신 Blob을 IndexedDB에 저장하고, 브라우저 다운로드/새 탭으로 열기를 제공한다. Tauri 전용 기능(자동시작, 네이티브 알림, 네이티브 파일 다이얼로그)은 웹 표준 API로 교체하거나 제거한다.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Dexie.js 4 (IndexedDB), @dnd-kit, Web Notifications API

---

## File Structure

### 신규 생성
- `src/db.ts` — Dexie.js DB 스키마 및 인스턴스 (tasks, checklist_items, attachments, recurring_tasks 테이블)

### 수정
- `package.json` — Tauri 의존성 제거, `dexie` 추가, scripts 정리
- `vite.config.ts` — Tauri 관련 설정 제거
- `tsconfig.json` — 변경 없음
- `src/api.ts` — 전체 재작성 (invoke → Dexie 쿼리)
- `src/types.ts` — `Attachment` 타입에 `file_data` (Blob) 필드 추가
- `src/hooks/useNotifications.ts` — Tauri notification → Web Notifications API
- `src/components/TitleBar.tsx` — autostart 제거, 날씨 fetch 직접 호출
- `src/components/TaskModal.tsx` — Tauri dialog → `<input type="file">`, Blob 저장/다운로드

### 삭제
- `src-tauri/` 디렉토리 전체 (Rust 백엔드)

### 변경 없음
- `src/App.tsx`, `src/main.tsx`, `src/styles/index.css`, `index.html`
- `src/components/KanbanBoard.tsx`, `Column.tsx`, `TaskCard.tsx`, `Toolbar.tsx`, `StatusBar.tsx`, `ArchiveView.tsx`, `StatsView.tsx`, `RecurringView.tsx`
- `src/hooks/useTasks.ts`, `useTheme.ts`, `useKeyboardShortcuts.ts`

---

### Task 1: 의존성 교체

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: package.json에서 Tauri 의존성 제거하고 dexie 추가**

`package.json`의 dependencies를 다음으로 교체:

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "dexie": "^4.0.11",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  }
}
```

제거 대상: `@tauri-apps/api`, `@tauri-apps/cli`, `@tauri-apps/plugin-autostart`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-notification`

scripts에서 `"tauri": "tauri"` 제거.

- [ ] **Step 2: vite.config.ts에서 Tauri 설정 제거**

`vite.config.ts`를 다음으로 교체:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});
```

- [ ] **Step 3: npm install 실행**

Run: `npm install`
Expected: dexie 설치, Tauri 패키지 제거, node_modules 갱신 완료

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "chore: remove Tauri dependencies, add Dexie.js"
```

---

### Task 2: Dexie DB 스키마 생성

**Files:**
- Create: `src/db.ts`

- [ ] **Step 1: src/db.ts 작성**

```ts
import Dexie, { type EntityTable } from "dexie";

export interface DbTask {
  id?: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "submitted";
  priority: "urgent" | "high" | "normal" | "low";
  due_date: string | null;
  position: number;
  archived: number; // 0 or 1
  created_at: string;
  updated_at: string;
  label: string;
  start_time: string | null;
  end_time: string | null;
}

export interface DbChecklistItem {
  id?: number;
  task_id: number;
  text: string;
  checked: number; // 0 or 1
  position: number;
}

export interface DbAttachment {
  id?: number;
  task_id: number;
  file_name: string;
  file_data: Blob;
  file_type: string;
  created_at: string;
}

export interface DbRecurringTask {
  id?: number;
  title: string;
  description: string;
  priority: string;
  label: string;
  recurrence: "daily" | "weekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  auto_due_days: number;
  enabled: number; // 0 or 1
  last_generated: string | null;
}

const db = new Dexie("kanban-app") as Dexie & {
  tasks: EntityTable<DbTask, "id">;
  checklist_items: EntityTable<DbChecklistItem, "id">;
  attachments: EntityTable<DbAttachment, "id">;
  recurring_tasks: EntityTable<DbRecurringTask, "id">;
};

db.version(1).stores({
  tasks: "++id, status, archived, priority, label, due_date",
  checklist_items: "++id, task_id",
  attachments: "++id, task_id",
  recurring_tasks: "++id, enabled",
});

export { db };
```

- [ ] **Step 2: Commit**

```bash
git add src/db.ts
git commit -m "feat: add Dexie.js IndexedDB schema for web migration"
```

---

### Task 3: types.ts 수정 — Attachment 타입 변경

**Files:**
- Modify: `src/types.ts:56-62`

- [ ] **Step 1: Attachment 인터페이스 수정**

`src/types.ts`의 `Attachment` 인터페이스를 다음으로 교체:

```ts
export interface Attachment {
  id: number;
  task_id: number;
  file_name: string;
  file_type: string;
  file_data?: Blob;
  created_at: string;
}
```

`file_path: string` 필드를 제거하고 `file_type: string`과 `file_data?: Blob`으로 교체한다. `file_data`는 optional로 두어 목록 조회 시 Blob을 로드하지 않아도 된다.

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: update Attachment type for web blob storage"
```

---

### Task 4: api.ts 전체 재작성 — Dexie 기반

**Files:**
- Modify: `src/api.ts` (전체 재작성)

- [ ] **Step 1: api.ts를 Dexie 기반으로 재작성**

`src/api.ts`의 전체 내용을 다음으로 교체:

```ts
import { db } from "./db";
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  GetTasksFilter,
  ChecklistItem,
  Attachment,
  RecurringTask,
  CreateRecurringInput,
} from "./types";

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const api = {
  getTasks: async (filter: GetTasksFilter = {}): Promise<Task[]> => {
    let collection = db.tasks.where("archived").equals(0);
    let results = await collection.toArray();

    if (filter.search) {
      const s = filter.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s)
      );
    }

    if (filter.priority) {
      results = results.filter((t) => t.priority === filter.priority);
    }

    if (filter.label) {
      results = results.filter((t) => t.label === filter.label);
    }

    const todayStr = today();

    if (filter.due_filter) {
      switch (filter.due_filter) {
        case "today":
          results = results.filter(
            (t) => t.due_date != null && t.due_date <= todayStr
          );
          break;
        case "week":
          results = results.filter(
            (t) => t.due_date != null && t.due_date <= addDays(todayStr, 7)
          );
          break;
        case "next_week":
          results = results.filter(
            (t) => t.due_date != null && t.due_date <= addDays(todayStr, 14)
          );
          break;
      }
    }

    if (filter.due_date_until) {
      results = results.filter(
        (t) => t.due_date != null && t.due_date <= filter.due_date_until!
      );
    }

    results.sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return a.position - b.position;
    });

    return results.map((t) => ({
      ...t,
      id: t.id!,
      archived: !!t.archived,
    })) as Task[];
  },

  createTask: async (input: CreateTaskInput): Promise<Task> => {
    // Shift existing todo tasks down
    const todos = await db.tasks
      .where("status")
      .equals("todo")
      .and((t) => t.archived === 0)
      .toArray();
    await Promise.all(
      todos.map((t) => db.tasks.update(t.id!, { position: t.position + 1 }))
    );

    const ts = now();
    const id = await db.tasks.add({
      title: input.title,
      description: input.description || "",
      status: "todo",
      priority: input.priority || "normal",
      due_date: input.due_date || null,
      position: 0,
      archived: 0,
      created_at: ts,
      updated_at: ts,
      label: input.label || "",
      start_time: input.start_time || null,
      end_time: input.end_time || null,
    });

    return (await db.tasks.get(id)) as unknown as Task;
  },

  updateTask: async (input: UpdateTaskInput): Promise<Task> => {
    const changes: Record<string, unknown> = { updated_at: now() };
    if (input.title !== undefined) changes.title = input.title;
    if (input.description !== undefined) changes.description = input.description;
    if (input.priority !== undefined) changes.priority = input.priority;
    if (input.label !== undefined) changes.label = input.label;
    if (input.due_date !== undefined) changes.due_date = input.due_date || null;
    if (input.start_time !== undefined)
      changes.start_time = input.start_time || null;
    if (input.end_time !== undefined) changes.end_time = input.end_time || null;

    await db.tasks.update(input.id, changes);
    return (await db.tasks.get(input.id)) as unknown as Task;
  },

  moveTask: async (input: MoveTaskInput): Promise<Task> => {
    // Shift tasks in target column
    const targets = await db.tasks
      .where("status")
      .equals(input.status)
      .and((t) => t.archived === 0 && t.position >= input.position && t.id !== input.id)
      .toArray();
    await Promise.all(
      targets.map((t) => db.tasks.update(t.id!, { position: t.position + 1 }))
    );

    await db.tasks.update(input.id, {
      status: input.status,
      position: input.position,
      updated_at: now(),
    });

    return (await db.tasks.get(input.id)) as unknown as Task;
  },

  archiveTask: async (id: number): Promise<void> => {
    await db.tasks.update(id, { archived: 1, updated_at: now() });
  },

  getArchivedTasks: async (): Promise<Task[]> => {
    const results = await db.tasks
      .where("archived")
      .equals(1)
      .reverse()
      .sortBy("updated_at");
    return results as unknown as Task[];
  },

  restoreTask: async (id: number): Promise<Task> => {
    const todos = await db.tasks
      .where("status")
      .equals("todo")
      .and((t) => t.archived === 0)
      .toArray();
    await Promise.all(
      todos.map((t) => db.tasks.update(t.id!, { position: t.position + 1 }))
    );

    await db.tasks.update(id, {
      archived: 0,
      status: "todo",
      position: 0,
      updated_at: now(),
    });

    return (await db.tasks.get(id)) as unknown as Task;
  },

  deleteTask: async (id: number): Promise<void> => {
    await db.tasks.delete(id);
    await db.checklist_items.where("task_id").equals(id).delete();
    await db.attachments.where("task_id").equals(id).delete();
  },

  exportTasks: async (): Promise<string> => {
    const tasks = await db.tasks.orderBy("status").toArray();
    return JSON.stringify(tasks, null, 2);
  },

  importTasks: async (jsonData: string): Promise<void> => {
    const tasks = JSON.parse(jsonData);
    await db.tasks.clear();
    await db.tasks.bulkAdd(tasks);
  },

  getStats: async () => {
    const todayStr = today();
    const monthStart = todayStr.slice(0, 7); // "YYYY-MM"

    const all = await db.tasks.toArray();

    const this_month_submitted = all.filter(
      (t) => t.status === "submitted" && t.created_at.startsWith(monthStart)
    ).length;
    const total_active = all.filter((t) => t.archived === 0).length;
    const total_archived = all.filter((t) => t.archived === 1).length;
    const overdue = all.filter(
      (t) =>
        t.archived === 0 &&
        t.due_date != null &&
        t.due_date < todayStr
    ).length;

    const by_priority: Record<string, number> = {};
    all
      .filter((t) => t.archived === 0)
      .forEach((t) => {
        by_priority[t.priority] = (by_priority[t.priority] || 0) + 1;
      });

    return { this_month_submitted, total_active, total_archived, overdue, by_priority };
  },

  // Checklist
  getChecklist: async (taskId: number): Promise<ChecklistItem[]> => {
    const items = await db.checklist_items
      .where("task_id")
      .equals(taskId)
      .sortBy("position");
    return items.map((i) => ({
      ...i,
      id: i.id!,
      checked: !!i.checked,
    })) as ChecklistItem[];
  },

  addChecklistItem: async (
    taskId: number,
    text: string
  ): Promise<ChecklistItem> => {
    const existing = await db.checklist_items
      .where("task_id")
      .equals(taskId)
      .toArray();
    const position = existing.length;

    const id = await db.checklist_items.add({
      task_id: taskId,
      text,
      checked: 0,
      position,
    });

    return { id: id as number, task_id: taskId, text, checked: false, position };
  },

  toggleChecklistItem: async (id: number): Promise<void> => {
    const item = await db.checklist_items.get(id);
    if (item) {
      await db.checklist_items.update(id, {
        checked: item.checked ? 0 : 1,
      });
    }
  },

  deleteChecklistItem: async (id: number): Promise<void> => {
    await db.checklist_items.delete(id);
  },

  // Attachments
  getAttachments: async (taskId: number): Promise<Attachment[]> => {
    const items = await db.attachments
      .where("task_id")
      .equals(taskId)
      .sortBy("created_at");
    return items.map((a) => ({
      id: a.id!,
      task_id: a.task_id,
      file_name: a.file_name,
      file_type: a.file_type,
      created_at: a.created_at,
    }));
  },

  addAttachment: async (
    taskId: number,
    fileName: string,
    fileData: Blob,
    fileType: string
  ): Promise<Attachment> => {
    const id = await db.attachments.add({
      task_id: taskId,
      file_name: fileName,
      file_data: fileData,
      file_type: fileType,
      created_at: now(),
    });

    return {
      id: id as number,
      task_id: taskId,
      file_name: fileName,
      file_type: fileType,
      created_at: now(),
    };
  },

  deleteAttachment: async (id: number): Promise<void> => {
    await db.attachments.delete(id);
  },

  openAttachment: async (id: number): Promise<void> => {
    const att = await db.attachments.get(id);
    if (!att) return;
    const url = URL.createObjectURL(att.file_data);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  downloadAttachment: async (id: number): Promise<void> => {
    const att = await db.attachments.get(id);
    if (!att) return;
    const url = URL.createObjectURL(att.file_data);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.file_name;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Recurring
  getRecurringTasks: async (): Promise<RecurringTask[]> => {
    const items = await db.recurring_tasks.orderBy("id").toArray();
    return items.map((r) => ({
      ...r,
      id: r.id!,
      enabled: !!r.enabled,
    })) as unknown as RecurringTask[];
  },

  createRecurringTask: async (
    input: CreateRecurringInput
  ): Promise<RecurringTask> => {
    const id = await db.recurring_tasks.add({
      title: input.title,
      description: input.description || "",
      priority: input.priority || "normal",
      label: input.label || "",
      recurrence: input.recurrence as "daily" | "weekly" | "monthly",
      day_of_week: input.day_of_week ?? null,
      day_of_month: input.day_of_month ?? null,
      auto_due_days: input.auto_due_days || 0,
      enabled: 1,
      last_generated: null,
    });

    return (await db.recurring_tasks.get(id)) as unknown as RecurringTask;
  },

  deleteRecurringTask: async (id: number): Promise<void> => {
    await db.recurring_tasks.delete(id);
  },

  toggleRecurringTask: async (id: number): Promise<void> => {
    const item = await db.recurring_tasks.get(id);
    if (item) {
      await db.recurring_tasks.update(id, {
        enabled: item.enabled ? 0 : 1,
      });
    }
  },

  generateRecurringTasks: async (): Promise<number> => {
    const todayStr = today();
    const todayDate = new Date();
    const weekday = (todayDate.getDay() + 6) % 7; // 0=Mon..6=Sun
    const dayOfMonth = todayDate.getDate();

    const recurrings = await db.recurring_tasks
      .where("enabled")
      .equals(1)
      .toArray();

    let count = 0;

    for (const rt of recurrings) {
      if (rt.last_generated === todayStr) continue;

      let shouldGenerate = false;
      if (rt.recurrence === "daily") shouldGenerate = true;
      if (rt.recurrence === "weekly" && rt.day_of_week === weekday)
        shouldGenerate = true;
      if (rt.recurrence === "monthly" && rt.day_of_month === dayOfMonth)
        shouldGenerate = true;

      if (!shouldGenerate) continue;

      const dueDate =
        rt.auto_due_days > 0 ? addDays(todayStr, rt.auto_due_days) : null;

      // Shift todo tasks
      const todos = await db.tasks
        .where("status")
        .equals("todo")
        .and((t) => t.archived === 0)
        .toArray();
      await Promise.all(
        todos.map((t) =>
          db.tasks.update(t.id!, { position: t.position + 1 })
        )
      );

      const ts = now();
      await db.tasks.add({
        title: rt.title,
        description: rt.description,
        status: "todo",
        priority: rt.priority as "urgent" | "high" | "normal" | "low",
        due_date: dueDate,
        position: 0,
        archived: 0,
        created_at: ts,
        updated_at: ts,
        label: rt.label,
        start_time: null,
        end_time: null,
      });

      await db.recurring_tasks.update(rt.id!, { last_generated: todayStr });
      count++;
    }

    return count;
  },

  // Weather (직접 fetch)
  getWeather: async (
    lat: number,
    lon: number
  ): Promise<{ temp: string; humidity: string; wind: string; desc: string }> => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Seoul`;
    const res = await fetch(url);
    const body = await res.json();

    const current = body.current;
    const temp = current.temperature_2m ?? 0;
    const humidity = current.relative_humidity_2m ?? 0;
    const wind = current.wind_speed_10m ?? 0;
    const code = current.weather_code ?? 0;

    const descMap: Record<number, string> = {
      0: "맑음 ☀️",
      1: "구름 조금 🌤️",
      2: "구름 조금 🌤️",
      3: "흐림 ☁️",
      45: "안개 🌫️",
      48: "안개 🌫️",
      51: "이슬비 🌦️",
      53: "이슬비 🌦️",
      55: "이슬비 🌦️",
      61: "비 🌧️",
      63: "비 🌧️",
      65: "비 🌧️",
      66: "눈비 🌨️",
      67: "눈비 🌨️",
      71: "눈 ❄️",
      73: "눈 ❄️",
      75: "눈 ❄️",
      77: "눈 ❄️",
      80: "소나기 🌧️",
      81: "소나기 🌧️",
      82: "소나기 🌧️",
      85: "눈보라 ❄️",
      86: "눈보라 ❄️",
      95: "뇌우 ⛈️",
      96: "뇌우 ⛈️",
      99: "뇌우 ⛈️",
    };

    return {
      temp: `${Math.round(temp)}°C`,
      humidity: `${Math.round(humidity)}%`,
      wind: `${Math.round(wind)}m/s`,
      desc: descMap[code] || "알 수 없음",
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/api.ts
git commit -m "feat: rewrite api.ts with Dexie.js IndexedDB operations"
```

---

### Task 5: useNotifications.ts — Web Notifications API로 교체

**Files:**
- Modify: `src/hooks/useNotifications.ts` (전체 재작성)

- [ ] **Step 1: Web Notifications API 기반으로 재작성**

```ts
import { useEffect, useRef } from "react";
import type { Task } from "../types";

export function useNotifications(tasks: Task[]) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current || tasks.length === 0) return;
    hasFired.current = true;

    async function checkAndNotify() {
      if (!("Notification" in window)) return;

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission !== "granted") return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayStr = today.toISOString().slice(0, 10);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      const dday = tasks.filter(
        (t) => t.due_date === todayStr && t.status !== "submitted"
      );
      const d1 = tasks.filter(
        (t) => t.due_date === tomorrowStr && t.status !== "submitted"
      );
      const overdue = tasks.filter(
        (t) => t.due_date && t.due_date < todayStr && t.status !== "submitted"
      );

      if (dday.length > 0) {
        new Notification("⚠️ 오늘 마감", {
          body: dday.map((t) => `• ${t.title}`).join("\n"),
        });
      }
      if (d1.length > 0) {
        new Notification("📌 내일 마감", {
          body: d1.map((t) => `• ${t.title}`).join("\n"),
        });
      }
      if (overdue.length > 0) {
        new Notification("🚨 기한 초과", {
          body: `${overdue.length}건의 업무가 기한을 초과했습니다.`,
        });
      }
    }

    checkAndNotify();
  }, [tasks]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useNotifications.ts
git commit -m "feat: replace Tauri notifications with Web Notifications API"
```

---

### Task 6: TitleBar.tsx — autostart 제거, 날씨 직접 fetch

**Files:**
- Modify: `src/components/TitleBar.tsx`

- [ ] **Step 1: Tauri autostart import 제거**

파일 상단의 다음 줄을 제거:
```ts
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
```

- [ ] **Step 2: autostart 관련 state 및 로직 제거**

`const [autoStart, setAutoStart] = useState(false);` 제거.

`useEffect` 내의 `isEnabled().then(setAutoStart).catch(() => {});` 제거.

`toggleAutoStart` 함수 전체 제거:
```ts
const toggleAutoStart = async () => {
  try {
    if (autoStart) { await disable(); setAutoStart(false); }
    else { await enable(); setAutoStart(true); }
  } catch (err) { console.error("자동시작 설정 실패:", err); }
};
```

- [ ] **Step 3: 날씨 API를 직접 fetch로 교체**

`api.getWeather(region.lat, region.lon)` 호출을 다음으로 교체:

```ts
const fetchWeather = async () => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia/Seoul`;
    const res = await fetch(url);
    const body = await res.json();
    const current = body.current;
    const temp = Math.round(current.temperature_2m ?? 0);
    const code = current.weather_code ?? 0;
    const descMap: Record<number, string> = {
      0: "맑음 ☀️", 1: "구름 조금 🌤️", 2: "구름 조금 🌤️", 3: "흐림 ☁️",
      45: "안개 🌫️", 48: "안개 🌫️", 51: "이슬비 🌦️", 53: "이슬비 🌦️", 55: "이슬비 🌦️",
      61: "비 🌧️", 63: "비 🌧️", 65: "비 🌧️", 66: "눈비 🌨️", 67: "눈비 🌨️",
      71: "눈 ❄️", 73: "눈 ❄️", 75: "눈 ❄️", 77: "눈 ❄️",
      80: "소나기 🌧️", 81: "소나기 🌧️", 82: "소나기 🌧️",
      85: "눈보라 ❄️", 86: "눈보라 ❄️", 95: "뇌우 ⛈️", 96: "뇌우 ⛈️", 99: "뇌우 ⛈️",
    };
    setWeather({ temp: `${temp}°C`, desc: descMap[code] || "알 수 없음" });
  } catch { /* ignore */ }
};
```

`import { api } from "../api";` import도 제거 (더 이상 사용하지 않음).

- [ ] **Step 4: menuOrder에서 autostart 제거**

`MenuId` 타입에서 `"autostart"` 제거:
```ts
type MenuId = "theme" | "backup" | "restore" | "recurring" | "stats" | "archive";
const DEFAULT_ORDER: MenuId[] = ["theme", "backup", "restore", "recurring", "stats", "archive"];
```

`menuLabels`에서 `autostart` 항목 제거.
`menuActions`에서 `autostart` 항목 제거.

- [ ] **Step 5: Commit**

```bash
git add src/components/TitleBar.tsx
git commit -m "feat: remove autostart, use direct fetch for weather in TitleBar"
```

---

### Task 7: TaskModal.tsx — 첨부파일을 Blob 기반으로 교체

**Files:**
- Modify: `src/components/TaskModal.tsx`

- [ ] **Step 1: Tauri dialog import 제거**

파일 상단의 다음 줄을 제거:
```ts
import { open } from "@tauri-apps/plugin-dialog";
```

- [ ] **Step 2: 숨겨진 file input ref 추가**

기존 state 선언 아래에 추가:
```ts
const fileInputRef = useRef<HTMLInputElement>(null);
```

`useRef`를 import에 추가 (`import { useState, useEffect, useRef } from "react";`).

- [ ] **Step 3: handleAttach 함수를 HTML file input 방식으로 교체**

기존 `handleAttach` 함수를 다음으로 교체:

```ts
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
```

- [ ] **Step 4: 첨부파일 열기를 다운로드/미리보기로 교체**

첨부파일 목록의 `onClick={() => api.openFile(att.file_path)}` 를 다음으로 교체:

```ts
onClick={() => api.openAttachment(att.id)}
```

title 속성도 `att.file_path` 대신 `att.file_name`으로 변경.

- [ ] **Step 5: 숨겨진 file input 엘리먼트 추가**

form 내부, 마지막 `</div>` 전에 추가:

```tsx
<input
  ref={fileInputRef}
  type="file"
  multiple
  className="hidden"
  onChange={handleFileSelected}
/>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/TaskModal.tsx
git commit -m "feat: replace Tauri file dialog with HTML file input, blob storage"
```

---

### Task 8: src-tauri 디렉토리 삭제

**Files:**
- Delete: `src-tauri/` 전체

- [ ] **Step 1: src-tauri 디렉토리 삭제**

Run: `rm -rf src-tauri`

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove Tauri/Rust backend (src-tauri)"
```

---

### Task 9: 빌드 확인 및 실행 테스트

**Files:** 없음 (검증만)

- [ ] **Step 1: TypeScript 빌드 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 완료

- [ ] **Step 2: Vite 빌드 확인**

Run: `npm run build`
Expected: `dist/` 디렉토리에 빌드 결과물 생성

- [ ] **Step 3: 개발 서버 실행 확인**

Run: `npm run dev`
Expected: `http://localhost:1420`에서 앱 정상 로드

- [ ] **Step 4: 주요 기능 수동 확인**

브라우저에서 다음 기능이 동작하는지 확인:
1. 새 카드 생성 (N 키 또는 버튼)
2. 카드 드래그앤드롭으로 컬럼 이동
3. 카드 수정 (체크리스트 추가/토글)
4. 파일 첨부 및 다운로드
5. 백업(JSON 다운로드) / 복원(JSON 업로드)
6. 테마 전환 (다크/라이트)
7. 날씨 표시
8. 필터/검색
9. 아카이브/복원
10. 반복 업무 등록 및 생성
11. 통계 확인

- [ ] **Step 5: Commit (빌드 성공 시)**

```bash
git commit --allow-empty -m "chore: verify web migration build and runtime"
```
