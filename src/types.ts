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
  label: string;
  start_time: string | null;
  end_time: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  due_date?: string;
  label?: string;
  start_time?: string;
  end_time?: string;
}

export interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  priority?: Priority;
  due_date?: string;
  label?: string;
  start_time?: string;
  end_time?: string;
}

export interface MoveTaskInput {
  id: number;
  status: Status;
  position: number;
}

export interface ChecklistItem {
  id: number;
  task_id: number;
  text: string;
  checked: boolean;
  position: number;
}

export interface Attachment {
  id: number;
  task_id: number;
  file_name: string;
  file_path: string;
  created_at: string;
}

export interface RecurringTask {
  id: number;
  title: string;
  description: string;
  priority: string;
  label: string;
  recurrence: string;
  day_of_week: number | null;
  day_of_month: number | null;
  auto_due_days: number;
  enabled: boolean;
  last_generated: string | null;
}

export interface CreateRecurringInput {
  title: string;
  description?: string;
  priority?: string;
  label?: string;
  recurrence: string;
  day_of_week?: number;
  day_of_month?: number;
  auto_due_days?: number;
}

export const DAYS_OF_WEEK = ["월", "화", "수", "목", "금", "토", "일"];

export interface GetTasksFilter {
  search?: string;
  priority?: Priority;
  due_filter?: DueFilter;
  due_date_until?: string;
  label?: string;
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

export const LABELS: { key: string; label: string; color: string }[] = [
  { key: "보고서", label: "보고서", color: "bg-blue-500/20 text-blue-400" },
  { key: "점검", label: "점검", color: "bg-green-500/20 text-green-400" },
  { key: "품의", label: "품의", color: "bg-purple-500/20 text-purple-400" },
  { key: "가전표", label: "가전표", color: "bg-amber-500/20 text-amber-400" },
  { key: "결재", label: "결재", color: "bg-pink-500/20 text-pink-400" },
  { key: "교육 이수", label: "교육 이수", color: "bg-cyan-500/20 text-cyan-400" },
  { key: "업체 연락처", label: "업체 연락처", color: "bg-teal-500/20 text-teal-400" },
  { key: "회의", label: "회의", color: "bg-indigo-500/20 text-indigo-400" },
  { key: "회의자료", label: "회의자료", color: "bg-violet-500/20 text-violet-400" },
  { key: "기타", label: "기타", color: "bg-slate-500/20 text-slate-400" },
];
