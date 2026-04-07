import { useState } from "react";
import { TitleBar } from "./components/TitleBar";
import { Toolbar } from "./components/Toolbar";
import { KanbanBoard } from "./components/KanbanBoard";
import { StatusBar } from "./components/StatusBar";
import { TaskModal } from "./components/TaskModal";
import { ArchiveView } from "./components/ArchiveView";
import { useTasks } from "./hooks/useTasks";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTheme } from "./hooks/useTheme";
import type { Task } from "./types";

function App() {
  const taskStore = useTasks();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showArchive, setShowArchive] = useState(false);

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

  useKeyboardShortcuts({
    onNewTask: handleNewTask,
    onCloseModal: () => {
      setShowModal(false);
      setShowArchive(false);
    },
  });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] text-slate-200 overflow-hidden">
      <TitleBar onArchiveClick={handleArchiveClick} />
      <Toolbar filter={taskStore.filter} onFilterChange={taskStore.setFilter} onNewTask={handleNewTask} />
      <KanbanBoard
        getTasksByStatus={taskStore.getTasksByStatus}
        onMoveTask={(id, status, position) => taskStore.moveTask({ id, status, position })}
        onTaskClick={handleTaskClick}
        onArchive={taskStore.archiveTask}
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
    </div>
  );
}

export default App;
