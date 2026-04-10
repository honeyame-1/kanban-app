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
  priority: "urgent" | "high" | "normal" | "low";
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
