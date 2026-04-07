import { useState } from "react";
import { api } from "./api";
import { TitleBar } from "./components/TitleBar";
import { Toolbar } from "./components/Toolbar";
import { KanbanBoard } from "./components/KanbanBoard";
import { StatusBar } from "./components/StatusBar";
import { TaskModal } from "./components/TaskModal";
import { ArchiveView } from "./components/ArchiveView";
import { StatsView } from "./components/StatsView";
import { useTasks } from "./hooks/useTasks";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTheme } from "./hooks/useTheme";
import type { Task } from "./types";

function App() {
  const taskStore = useTasks();
  const { theme, toggleTheme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showStats, setShowStats] = useState(false);

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
      a.download = `kanban-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("백업 실패:", err);
    }
  };

  const handleRestore = async (jsonData: string) => {
    try {
      await api.importTasks(jsonData);
      await taskStore.fetchTasks();
    } catch (err) {
      console.error("복원 실패:", err);
    }
  };

  useKeyboardShortcuts({
    onNewTask: handleNewTask,
    onCloseModal: () => {
      setShowModal(false);
      setShowArchive(false);
      setShowStats(false);
    },
  });

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === "dark" ? "bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] text-slate-200" : "bg-gradient-to-br from-[#f0f2f5] to-[#e8eaed] text-slate-800"}`}>
      <TitleBar onArchiveClick={handleArchiveClick} onStatsClick={() => setShowStats(true)} theme={theme} onToggleTheme={toggleTheme} onBackup={handleBackup} onRestore={handleRestore} />
      <Toolbar filter={taskStore.filter} onFilterChange={taskStore.setFilter} onNewTask={handleNewTask} />
      <KanbanBoard
        getTasksByStatus={taskStore.getTasksByStatus}
        onMoveTask={(id, status, position) => taskStore.moveTask({ id, status, position })}
        onTaskClick={handleTaskClick}
        onArchive={taskStore.archiveTask}
        onDuplicate={taskStore.duplicateTask}
      />
      <StatusBar tasks={taskStore.tasks} urgentCount={taskStore.urgentCount} />

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
    </div>
  );
}

export default App;
