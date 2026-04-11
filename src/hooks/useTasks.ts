import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";
import type { Task, CreateTaskInput, UpdateTaskInput, MoveTaskInput, GetTasksFilter, Status } from "../types";

type UndoAction =
  | { type: "create"; taskId: number }
  | { type: "update"; prev: UpdateTaskInput & { id: number } }
  | { type: "move"; prev: MoveTaskInput & { id: number } }
  | { type: "archive"; taskId: number };

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<GetTasksFilter>({});
  const [loading, setLoading] = useState(true);
  const undoStack = useRef<UndoAction[]>([]);

  const pushUndo = (action: UndoAction) => {
    undoStack.current.push(action);
    // 최대 30개만 유지
    if (undoStack.current.length > 30) undoStack.current.shift();
  };

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.getTasks(filter);
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchArchivedTasks = useCallback(async () => {
    try {
      const data = await api.getArchivedTasks();
      setArchivedTasks(data);
    } catch (err) {
      console.error("Failed to fetch archived tasks:", err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (input: CreateTaskInput) => {
    const created = await api.createTask(input);
    pushUndo({ type: "create", taskId: created.id });
    await fetchTasks();
  };

  const updateTask = async (input: UpdateTaskInput) => {
    // 변경 전 상태 저장
    const prev = tasks.find((t) => t.id === input.id);
    if (prev) {
      pushUndo({
        type: "update",
        prev: {
          id: prev.id,
          title: prev.title,
          description: prev.description,
          priority: prev.priority,
          due_date: prev.due_date || undefined,
          label: prev.label || undefined,
          start_time: prev.start_time || undefined,
          end_time: prev.end_time || undefined,
        },
      });
    }
    await api.updateTask(input);
    await fetchTasks();
  };

  const moveTask = async (input: MoveTaskInput) => {
    const prev = tasks.find((t) => t.id === input.id);
    if (prev) {
      pushUndo({
        type: "move",
        prev: { id: prev.id, status: prev.status, position: prev.position },
      });
    }
    await api.moveTask(input);
    await fetchTasks();
  };

  const duplicateTask = async (task: Task) => {
    const created = await api.createTask({
      title: task.title + " (복사)",
      description: task.description || undefined,
      priority: task.priority,
      due_date: task.due_date || undefined,
      label: task.label || undefined,
      start_time: task.start_time || undefined,
      end_time: task.end_time || undefined,
    });
    pushUndo({ type: "create", taskId: created.id });
    await fetchTasks();
  };

  const archiveTask = async (id: number) => {
    pushUndo({ type: "archive", taskId: id });
    await api.archiveTask(id);
    await fetchTasks();
  };

  const restoreTask = async (id: number) => {
    await api.restoreTask(id);
    await fetchTasks();
    await fetchArchivedTasks();
  };

  const deleteTask = async (id: number) => {
    await api.deleteTask(id);
    await fetchArchivedTasks();
  };

  const undo = async () => {
    const action = undoStack.current.pop();
    if (!action) return;

    try {
      switch (action.type) {
        case "create":
          // 생성 취소 = 아카이브 (첨부파일 보존)
          await api.archiveTask(action.taskId);
          break;
        case "update":
          // 수정 취소 = 이전 상태로 복원
          await api.updateTask(action.prev);
          break;
        case "move":
          // 이동 취소 = 이전 위치로 복원
          await api.moveTask(action.prev);
          break;
        case "archive":
          // 아카이브 취소 = 복원
          await api.restoreTask(action.taskId);
          break;
      }
      await fetchTasks();
    } catch (err) {
      console.error("Undo failed:", err);
    }
  };

  const getTasksByStatus = (status: Status) => {
    const filtered = tasks.filter((t) => t.status === status);
    if (status === "submitted") {
      return filtered.sort((a, b) => {
        if (!a.due_date && !b.due_date) return b.position - a.position;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return b.due_date.localeCompare(a.due_date);
      });
    }
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return filtered.sort((a, b) => {
      const aHas = a.due_date ? 0 : 1;
      const bHas = b.due_date ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      if (a.due_date && b.due_date) {
        const cmp = a.due_date.localeCompare(b.due_date);
        if (cmp !== 0) return cmp;
      }
      const pCmp = (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
      if (pCmp !== 0) return pCmp;
      return a.position - b.position;
    });
  };

  const urgentTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const diff = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
    return diff <= 1;
  });
  const urgentCount = urgentTasks.length;

  return {
    tasks,
    archivedTasks,
    filter,
    loading,
    urgentCount,
    urgentTasks,
    setFilter,
    getTasksByStatus,
    createTask,
    updateTask,
    moveTask,
    duplicateTask,
    archiveTask,
    restoreTask,
    deleteTask,
    fetchArchivedTasks,
    fetchTasks,
    undo,
  };
}
