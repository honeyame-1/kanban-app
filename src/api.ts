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
    let results = await db.tasks.where("archived").equals(0).toArray();

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
    const monthStart = todayStr.slice(0, 7);

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
      0: "맑음 ☀️", 1: "구름 조금 🌤️", 2: "구름 조금 🌤️", 3: "흐림 ☁️",
      45: "안개 🌫️", 48: "안개 🌫️", 51: "이슬비 🌦️", 53: "이슬비 🌦️", 55: "이슬비 🌦️",
      61: "비 🌧️", 63: "비 🌧️", 65: "비 🌧️", 66: "눈비 🌨️", 67: "눈비 🌨️",
      71: "눈 ❄️", 73: "눈 ❄️", 75: "눈 ❄️", 77: "눈 ❄️",
      80: "소나기 🌧️", 81: "소나기 🌧️", 82: "소나기 🌧️",
      85: "눈보라 ❄️", 86: "눈보라 ❄️", 95: "뇌우 ⛈️", 96: "뇌우 ⛈️", 99: "뇌우 ⛈️",
    };

    return {
      temp: `${Math.round(temp)}°C`,
      humidity: `${Math.round(humidity)}%`,
      wind: `${Math.round(wind)}m/s`,
      desc: descMap[code] || "알 수 없음",
    };
  },
};
