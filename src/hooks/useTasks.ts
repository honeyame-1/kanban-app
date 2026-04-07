import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { Task, CreateTaskInput, UpdateTaskInput, MoveTaskInput, GetTasksFilter, Status } from "../types";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<GetTasksFilter>({});
  const [loading, setLoading] = useState(true);

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
    await api.createTask(input);
    await fetchTasks();
  };

  const updateTask = async (input: UpdateTaskInput) => {
    await api.updateTask(input);
    await fetchTasks();
  };

  const moveTask = async (input: MoveTaskInput) => {
    await api.moveTask(input);
    await fetchTasks();
  };

  const duplicateTask = async (task: Task) => {
    await api.createTask({
      title: task.title + " (복사)",
      description: task.description || undefined,
      priority: task.priority,
      due_date: task.due_date || undefined,
      label: task.label || undefined,
    });
    await fetchTasks();
  };

  const archiveTask = async (id: number) => {
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

  const getTasksByStatus = (status: Status) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const urgentCount = tasks.filter((t) => {
    if (!t.due_date) return false;
    const diff = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000);
    return diff <= 1;
  }).length;

  return {
    tasks,
    archivedTasks,
    filter,
    loading,
    urgentCount,
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
  };
}
