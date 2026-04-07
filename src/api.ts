import { invoke } from "@tauri-apps/api/core";
import type { Task, CreateTaskInput, UpdateTaskInput, MoveTaskInput, GetTasksFilter, ChecklistItem, Attachment, RecurringTask, CreateRecurringInput } from "./types";

export const api = {
  getTasks: (filter: GetTasksFilter = {}) =>
    invoke<Task[]>("get_tasks", { filter }),

  createTask: (input: CreateTaskInput) =>
    invoke<Task>("create_task", { input }),

  updateTask: (input: UpdateTaskInput) =>
    invoke<Task>("update_task", { input }),

  moveTask: (input: MoveTaskInput) =>
    invoke<Task>("move_task", { input }),

  archiveTask: (id: number) =>
    invoke<void>("archive_task", { id }),

  getArchivedTasks: () =>
    invoke<Task[]>("get_archived_tasks"),

  restoreTask: (id: number) =>
    invoke<Task>("restore_task", { id }),

  deleteTask: (id: number) =>
    invoke<void>("delete_task", { id }),

  exportTasks: () =>
    invoke<string>("export_tasks"),

  importTasks: (jsonData: string) =>
    invoke<void>("import_tasks", { jsonData }),

  getStats: () =>
    invoke<{ this_month_submitted: number; total_active: number; total_archived: number; overdue: number; by_priority: Record<string, number> }>("get_stats"),

  getChecklist: (taskId: number) =>
    invoke<ChecklistItem[]>("get_checklist", { taskId }),

  addChecklistItem: (taskId: number, text: string) =>
    invoke<ChecklistItem>("add_checklist_item", { taskId, text }),

  toggleChecklistItem: (id: number) =>
    invoke<void>("toggle_checklist_item", { id }),

  deleteChecklistItem: (id: number) =>
    invoke<void>("delete_checklist_item", { id }),

  getAttachments: (taskId: number) =>
    invoke<Attachment[]>("get_attachments", { taskId }),

  addAttachment: (taskId: number, fileName: string, filePath: string) =>
    invoke<Attachment>("add_attachment", { taskId, fileName, filePath }),

  deleteAttachment: (id: number) =>
    invoke<void>("delete_attachment", { id }),

  openFile: (path: string) =>
    invoke<void>("open_file", { path }),

  getRecurringTasks: () =>
    invoke<RecurringTask[]>("get_recurring_tasks"),

  createRecurringTask: (input: CreateRecurringInput) =>
    invoke<RecurringTask>("create_recurring_task", { input }),

  deleteRecurringTask: (id: number) =>
    invoke<void>("delete_recurring_task", { id }),

  toggleRecurringTask: (id: number) =>
    invoke<void>("toggle_recurring_task", { id }),

  generateRecurringTasks: () =>
    invoke<number>("generate_recurring_tasks"),

  getWeather: (lat: number, lon: number) =>
    invoke<{ temp: string; humidity: string; wind: string; desc: string }>("get_weather", { lat, lon }),
};
