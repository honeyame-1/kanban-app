import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { COLUMNS } from "../types";
import type { Task, Status } from "../types";

interface KanbanBoardProps {
  getTasksByStatus: (status: Status) => Task[];
  onMoveTask: (id: number, status: Status, position: number) => void;
  onTaskClick: (task: Task) => void;
  onArchive: (id: number) => void;
}

export function KanbanBoard({ getTasksByStatus, onMoveTask, onTaskClick, onArchive }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as number;
    let targetStatus: Status;
    let targetPosition: number;

    const overIsColumn = COLUMNS.some((c) => c.key === over.id);
    if (overIsColumn) {
      targetStatus = over.id as Status;
      targetPosition = getTasksByStatus(targetStatus).length;
    } else {
      const overTask = over.data.current?.task as Task | undefined;
      if (!overTask) return;
      targetStatus = overTask.status;
      targetPosition = overTask.position;
    }

    onMoveTask(taskId, targetStatus, targetPosition);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-5 flex-1 overflow-hidden">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            status={col.key}
            label={col.label}
            icon={col.icon}
            tasks={getTasksByStatus(col.key)}
            onTaskClick={onTaskClick}
            onArchive={onArchive}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
