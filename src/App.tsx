import { useState, lazy, Suspense } from "react";
import { api } from "./api";
import { TitleBar } from "./components/TitleBar";
import { Toolbar } from "./components/Toolbar";
import { KanbanBoard } from "./components/KanbanBoard";
import { StatusBar } from "./components/StatusBar";
import { useTasks } from "./hooks/useTasks";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTheme } from "./hooks/useTheme";
import { useNotifications } from "./hooks/useNotifications";
import type { Task } from "./types";

const TaskModal = lazy(() => import("./components/TaskModal").then(m => ({ default: m.TaskModal })));
const ArchiveView = lazy(() => import("./components/ArchiveView").then(m => ({ default: m.ArchiveView })));
const StatsView = lazy(() => import("./components/StatsView").then(m => ({ default: m.StatsView })));
const RecurringView = lazy(() => import("./components/RecurringView").then(m => ({ default: m.RecurringView })));
const TemplateView = lazy(() => import("./components/TemplateView").then(m => ({ default: m.TemplateView })));

function App() {
  const taskStore = useTasks();
  useNotifications(taskStore.tasks);
  const { theme, toggleTheme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleNewTask = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleArchiveClick = () => {
    taskStore.fetchArchivedTasks();
    setShowArchive(true);
  };

  const handleBackup = async () => {
    try {
      const json = await api.exportTasks();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      a.download = `kanban-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("백업 실패:", err);
      alert("백업 저장에 실패했습니다.");
    }
  };

  const handleRestore = async (jsonData: string) => {
    try {
      await api.importTasks(jsonData);
      await taskStore.fetchTasks();
      alert("복원이 완료되었습니다.");
    } catch (err) {
      console.error("복원 실패:", err);
      alert(err instanceof Error ? `복원 실패: ${err.message}` : "복원 실패");
    }
  };

  useKeyboardShortcuts({
    onNewTask: handleNewTask,
    onCloseModal: () => {
      setShowModal(false);
      setShowArchive(false);
      setShowStats(false);
    },
    onUndo: taskStore.undo,
  });

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === "dark" ? "bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] text-slate-200" : "bg-gradient-to-br from-[#f0f2f5] to-[#e8eaed] text-slate-800"}`}>
      <TitleBar onArchiveClick={handleArchiveClick} onStatsClick={() => setShowStats(true)} onRecurringClick={() => setShowRecurring(true)} onTemplateClick={() => setShowTemplates(true)} theme={theme} onToggleTheme={toggleTheme} onBackup={handleBackup} onRestore={handleRestore} />
      <Toolbar filter={taskStore.filter} onFilterChange={taskStore.setFilter} onNewTask={handleNewTask} />
      <KanbanBoard
        getTasksByStatus={taskStore.getTasksByStatus}
        onMoveTask={(id, status, position) => taskStore.moveTask({ id, status, position })}
        onTaskClick={handleTaskClick}
        onArchive={taskStore.archiveTask}
        onDuplicate={taskStore.duplicateTask}
      />
      <StatusBar tasks={taskStore.tasks} urgentCount={taskStore.urgentCount} urgentTasks={taskStore.urgentTasks} />

      <Suspense fallback={null}>
        {showModal && (
          <TaskModal
            task={editingTask}
            onSave={async (input) => {
              if (editingTask) {
                await taskStore.updateTask({ id: editingTask.id, ...input });
              } else {
                await taskStore.createTask(input);
              }
              setShowModal(false);
            }}
            onClose={() => setShowModal(false)}
          />
        )}

        {showArchive && (
          <ArchiveView
            tasks={taskStore.archivedTasks}
            onRestore={taskStore.restoreTask}
            onDelete={taskStore.deleteTask}
            onClose={() => setShowArchive(false)}
          />
        )}

        {showStats && (
          <StatsView onClose={() => setShowStats(false)} />
        )}

        {showRecurring && (
          <RecurringView onClose={() => setShowRecurring(false)} onGenerated={taskStore.fetchTasks} />
        )}

        {showTemplates && (
          <TemplateView onClose={() => setShowTemplates(false)} />
        )}
      </Suspense>
    </div>
  );
}

export default App;
