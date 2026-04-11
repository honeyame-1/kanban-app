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
  ChecklistTemplate,
  Status,
  Priority,
  Recurrence,
} from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

function localDateTime(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function now() {
  return localDateTime();
}

function today() {
  return localDate();
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

// Shift positions of all active todo cards by +1, freeing slot 0.
// Must be called inside a `db.tasks` rw-transaction.
async function shiftTodoPositions(): Promise<void> {
  const todos = await db.tasks
    .where("status")
    .equals("todo")
    .and((t) => t.archived === 0)
    .toArray();
  await db.tasks.bulkUpdate(
    todos.map((t) => ({ key: t.id!, changes: { position: t.position + 1 } }))
  );
}

// File types that can execute scripts when opened via blob: URL — those would
// run against this app's origin and read its IndexedDB. Open via download only.
const UNSAFE_OPEN_EXTENSIONS = new Set([
  "html", "htm", "xhtml", "xml", "svg", "svgz", "js", "mjs", "mhtml",
]);
const UNSAFE_OPEN_MIMES = [
  "text/html",
  "application/xhtml",
  "application/xml",
  "text/xml",
  "image/svg",
  "application/javascript",
  "text/javascript",
];
// File types that browsers cannot render inline — opening via blob: URL just
// triggers a download with the random blob UUID as the filename. Force the
// download path so the original filename is preserved via <a download>.
const NON_RENDERABLE_EXTENSIONS = new Set([
  "hwp", "hwpx", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "zip", "rar", "7z", "tar", "gz",
  "exe", "msi", "dmg", "apk",
  "mp3", "wav", "flac", "ogg",
  "mp4", "avi", "mkv", "mov",
]);

function isUnsafeForInlineOpen(fileName: string, fileType: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (UNSAFE_OPEN_EXTENSIONS.has(ext)) return true;
  if (NON_RENDERABLE_EXTENSIONS.has(ext)) return true;
  const mime = (fileType || "").toLowerCase();
  return UNSAFE_OPEN_MIMES.some((m) => mime.startsWith(m));
}

const VALID_STATUSES: Set<string> = new Set(["todo", "in_progress", "submitted"]);
const VALID_PRIORITIES: Set<string> = new Set(["urgent", "high", "normal", "low"]);

function isValidTaskRow(t: unknown): t is Record<string, unknown> {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    typeof o.status === "string" && VALID_STATUSES.has(o.status as string) &&
    typeof o.priority === "string" && VALID_PRIORITIES.has(o.priority as string) &&
    typeof o.position === "number"
  );
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
    const ts = now();
    const id = await db.transaction("rw", db.tasks, async () => {
      await shiftTodoPositions();
      return await db.tasks.add({
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
    });

    const row = await db.tasks.get(id);
    if (!row) throw new Error("createTask: row missing after insert");
    return { ...row, id: row.id!, archived: !!row.archived } as Task;
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
    const row = await db.tasks.get(input.id);
    if (!row) throw new Error(`updateTask: id ${input.id} not found`);
    return { ...row, id: row.id!, archived: !!row.archived } as Task;
  },

  moveTask: async (input: MoveTaskInput): Promise<Task> => {
    await db.transaction("rw", db.tasks, async () => {
      const current = await db.tasks.get(input.id);
      if (!current) throw new Error(`moveTask: id ${input.id} not found`);

      const sameColumn = current.status === input.status;
      const oldPosition = current.position;
      const newPosition = input.position;

      // Collect siblings (excluding the moved task) in target column.
      const siblings = await db.tasks
        .where("status")
        .equals(input.status)
        .and((t) => t.archived === 0 && t.id !== input.id)
        .toArray();

      const updates: { key: number; changes: { position: number } }[] = [];

      if (sameColumn) {
        // Reorder within the same column: shift the slice between old and new.
        for (const s of siblings) {
          if (oldPosition < newPosition) {
            // moving down: shift items in (old, new] up by 1
            if (s.position > oldPosition && s.position <= newPosition) {
              updates.push({ key: s.id!, changes: { position: s.position - 1 } });
            }
          } else if (oldPosition > newPosition) {
            // moving up: shift items in [new, old) down by 1
            if (s.position >= newPosition && s.position < oldPosition) {
              updates.push({ key: s.id!, changes: { position: s.position + 1 } });
            }
          }
        }
      } else {
        // Cross-column: bump siblings at and after the new position.
        for (const s of siblings) {
          if (s.position >= newPosition) {
            updates.push({ key: s.id!, changes: { position: s.position + 1 } });
          }
        }
        // Also fill the gap left in the source column.
        const sourceSiblings = await db.tasks
          .where("status")
          .equals(current.status)
          .and((t) => t.archived === 0 && t.id !== input.id && t.position > oldPosition)
          .toArray();
        for (const s of sourceSiblings) {
          updates.push({ key: s.id!, changes: { position: s.position - 1 } });
        }
      }

      if (updates.length > 0) {
        await db.tasks.bulkUpdate(updates);
      }

      await db.tasks.update(input.id, {
        status: input.status,
        position: newPosition,
        updated_at: now(),
      });
    });

    const row = await db.tasks.get(input.id);
    if (!row) throw new Error(`moveTask: id ${input.id} missing after update`);
    return { ...row, id: row.id!, archived: !!row.archived } as Task;
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
    return results.map((t) => ({
      ...t,
      id: t.id!,
      archived: !!t.archived,
    })) as Task[];
  },

  restoreTask: async (id: number): Promise<Task> => {
    await db.transaction("rw", db.tasks, async () => {
      await shiftTodoPositions();
      await db.tasks.update(id, {
        archived: 0,
        status: "todo",
        position: 0,
        updated_at: now(),
      });
    });

    const row = await db.tasks.get(id);
    if (!row) throw new Error(`restoreTask: id ${id} not found`);
    return { ...row, id: row.id!, archived: !!row.archived } as Task;
  },

  deleteTask: async (id: number): Promise<void> => {
    await db.transaction(
      "rw",
      [db.tasks, db.checklist_items, db.attachments],
      async () => {
        await db.tasks.delete(id);
        await db.checklist_items.where("task_id").equals(id).delete();
        await db.attachments.where("task_id").equals(id).delete();
      }
    );
  },

  exportTasks: async (): Promise<string> => {
    const tasks = await db.tasks.orderBy("status").toArray();
    return JSON.stringify(tasks, null, 2);
  },

  importTasks: async (jsonData: string): Promise<void> => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      throw new Error("백업 파일이 올바른 JSON 형식이 아닙니다.");
    }
    if (!Array.isArray(parsed) || !parsed.every(isValidTaskRow)) {
      throw new Error("백업 파일 형식이 올바르지 않습니다.");
    }
    // Strip ids so Dexie autogenerates fresh ones (avoids collisions).
    const rows = parsed.map((t) => {
      const { id: _id, ...rest } = t as Record<string, unknown>;
      return rest;
    });

    await db.transaction(
      "rw",
      [db.tasks, db.checklist_items, db.attachments],
      async () => {
        await db.checklist_items.clear();
        await db.attachments.clear();
        await db.tasks.clear();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.tasks.bulkAdd(rows as any);
      }
    );
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
    // Blob URLs inherit the parent origin, so opening HTML/SVG/XML in a new
    // tab would execute scripts against this app's IndexedDB. Force download
    // for those types instead of window.open.
    if (isUnsafeForInlineOpen(att.file_name, att.file_type)) {
      await api.downloadAttachment(id);
      return;
    }
    const blob = new Blob([att.file_data], { type: att.file_type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  downloadAttachment: async (id: number): Promise<void> => {
    const att = await db.attachments.get(id);
    if (!att) return;
    const blob = new Blob([att.file_data], { type: att.file_type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  getRecurringTasks: async (): Promise<RecurringTask[]> => {
    const items = await db.recurring_tasks.orderBy("id").toArray();
    return items.map((r) => ({
      ...r,
      id: r.id!,
      enabled: !!r.enabled,
    })) as RecurringTask[];
  },

  createRecurringTask: async (
    input: CreateRecurringInput
  ): Promise<RecurringTask> => {
    const id = await db.recurring_tasks.add({
      title: input.title,
      description: input.description || "",
      priority: input.priority || "normal",
      label: input.label || "",
      recurrence: input.recurrence,
      day_of_week: input.day_of_week ?? null,
      day_of_month: input.day_of_month ?? null,
      auto_due_days: input.auto_due_days || 0,
      enabled: 1,
      last_generated: null,
    });

    const row = await db.recurring_tasks.get(id);
    if (!row) throw new Error("createRecurringTask: row missing after insert");
    return { ...row, id: row.id!, enabled: !!row.enabled } as RecurringTask;
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
      const ts = now();

      await db.transaction("rw", [db.tasks, db.recurring_tasks], async () => {
        await shiftTodoPositions();
        await db.tasks.add({
          title: rt.title,
          description: rt.description,
          status: "todo",
          priority: rt.priority as Priority,
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
      });
      count++;
    }

    return count;
  },

  // ── Checklist Templates ──────────────────────────────────────────
  getChecklistTemplates: async (): Promise<ChecklistTemplate[]> => {
    const rows = await db.checklist_templates.orderBy("id").toArray();
    return rows.map((r) => ({
      id: r.id!,
      name: r.name,
      items: (() => { try { return JSON.parse(r.items) as string[]; } catch { return []; } })(),
      created_at: r.created_at,
    }));
  },

  addChecklistTemplate: async (name: string, items: string[]): Promise<ChecklistTemplate> => {
    const now = new Date().toISOString();
    const id = await db.checklist_templates.add({
      name,
      items: JSON.stringify(items),
      created_at: now,
    });
    return { id: id as number, name, items, created_at: now };
  },

  updateChecklistTemplate: async (id: number, name: string, items: string[]): Promise<void> => {
    await db.checklist_templates.update(id, { name, items: JSON.stringify(items) });
  },

  deleteChecklistTemplate: async (id: number): Promise<void> => {
    await db.checklist_templates.delete(id);
  },

  applyChecklistTemplate: async (taskId: number, templateId: number): Promise<ChecklistItem[]> => {
    const tpl = await db.checklist_templates.get(templateId);
    if (!tpl) return [];
    let items: string[];
    try { items = JSON.parse(tpl.items) as string[]; } catch { return []; }
    const existing = await db.checklist_items.where("task_id").equals(taskId).count();
    const newItems: ChecklistItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const id = await db.checklist_items.add({
        task_id: taskId,
        text: items[i],
        checked: 0,
        position: existing + i,
      });
      newItems.push({ id: id as number, task_id: taskId, text: items[i], checked: false, position: existing + i });
    }
    return newItems;
  },
};

// Re-exported for type-only callers that previously imported from here.
export type { Status, Priority, Recurrence };
