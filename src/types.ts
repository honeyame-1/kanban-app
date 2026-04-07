export type Status = "todo" | "in_progress" | "submitted";
export type Priority = "urgent" | "high" | "normal" | "low";
export type DueFilter = "today" | "week" | "next_week" | "all";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string | null;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  due_date?: string;
}

export interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  priority?: Priority;
  due_date?: string;
}

export interface MoveTaskInput {
  id: number;
  status: Status;
  position: number;
}

export interface GetTasksFilter {
  search?: string;
  priority?: Priority;
  due_filter?: DueFilter;
  due_date_until?: string;
}

export const COLUMNS: { key: Status; label: string; icon: string }[] = [
  { key: "todo", label: "할 일", icon: "📋" },
  { key: "in_progress", label: "진행중", icon: "🔄" },
  { key: "submitted", label: "제출완료", icon: "✅" },
];

export const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: "urgent", label: "긴급", color: "bg-red-500/20 text-red-400" },
  { key: "high", label: "높음", color: "bg-orange-500/20 text-orange-400" },
  { key: "normal", label: "보통", color: "bg-emerald-500/20 text-emerald-400" },
  { key: "low", label: "낮음", color: "bg-slate-500/20 text-slate-400" },
];
