import { DndContext, DragOverlay, pointerWithin, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, type DragOverEvent } from "@dnd-kit/core";
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
  onDuplicate: (task: Task) => void;
}

const COLUMN_KEYS = new Set(COLUMNS.map((c) => c.key as string));

function resolveTarget(
  overId: string | number,
  overData: Record<string, unknown> | undefined,
  getTasksByStatus: (status: Status) => Task[]
): { status: Status; position: number } | null {
  if (COLUMN_KEYS.has(String(overId))) {
    const status = String(overId) as Status;
    return { status, position: getTasksByStatus(status).length };
  }
  const overTask = overData?.task as Task | undefined;
  if (overTask) {
    return { status: overTask.status, position: overTask.position };
  }
  return null;
}

export function KanbanBoard({ getTasksByStatus, onMoveTask, onTaskClick, onArchive, onDuplicate }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<Status | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }
    if (COLUMN_KEYS.has(String(over.id))) {
      setOverColumnId(String(over.id) as Status);
    } else {
      const overTask = over.data.current?.task as Task | undefined;
      setOverColumnId(overTask?.status ?? null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    setOverColumnId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as number;
    const target = resolveTarget(over.id, over.data.current, getTasksByStatus);
    if (!target) return;

    const activeTaskData = active.data.current?.task as Task | undefined;
    if (activeTaskData && activeTaskData.status === target.status && activeTaskData.position === target.position) return;

    onMoveTask(taskId, target.status, target.position);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
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
            onDuplicate={onDuplicate}
            isOver={overColumnId === col.key}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  );
}
