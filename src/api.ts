import { invoke } from "@tauri-apps/api/core";
import type { Task, CreateTaskInput, UpdateTaskInput, MoveTaskInput, GetTasksFilter } from "./types";

export const api = {
  getTasks: (filter: GetTasksFilter = {}) =>
    invoke<Task[]>("get_tasks", { filter }),

  createTask: (input: CreateTaskInput) =>
    invoke<Task>("create_task", { input }),

  updateTask: (input: UpdateTaskInput) =>
    invoke<Task>("update_task", { input }),

  moveTask: (input: MoveTaskInput) =>
    invoke<void>("move_task", { input }),

  archiveTask: (id: number) =>
    invoke<void>("archive_task", { id }),

  getArchivedTasks: () =>
    invoke<Task[]>("get_archived_tasks"),

  restoreTask: (id: number) =>
    invoke<void>("restore_task", { id }),

  deleteTask: (id: number) =>
    invoke<void>("delete_task", { id }),

  exportTasks: () =>
    invoke<string>("export_tasks"),

  importTasks: (jsonData: string) =>
    invoke<void>("import_tasks", { jsonData }),

  getStats: () =>
    invoke<{ this_month_submitted: number; total_active: number; total_archived: number; overdue: number; by_priority: Record<string, number> }>("get_stats"),
};
