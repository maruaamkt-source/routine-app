"use client";

import { useState } from "react";
import { deleteFutureOccurrences } from "@/lib/taskSeries";
import TaskEditor from "@/components/TaskEditor";

const KIND_LABEL = {
  compromisso: "Compromisso",
  lembrete: "Lembrete",
};

export default function TaskList({ tasks, onToggle, onDelete, onUpdate }) {
  const [editingId, setEditingId] = useState(null);

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-mute py-6">
        Nenhuma tarefa aqui ainda. Que tal adicionar a primeira?
      </p>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    const ta = a.start_time ?? a.due_time;
    const tb = b.start_time ?? b.due_time;
    if (!ta) return 1;
    if (!tb) return -1;
    return ta.localeCompare(tb);
  });

  async function handleDelete(task) {
    const removedFuture = await deleteFutureOccurrences(task);
    await onDelete(task);
    if (removedFuture) window.location.reload();
  }

  return (
    <ul className="flex flex-col">
      {sorted.map((task) => {
        if (editingId === task.id) {
          return (
            <li key={task.id} className="py-3">
              <TaskEditor
                task={task}
                onCancel={() => setEditingId(null)}
                onSaved={(updated) => {
                  onUpdate?.(updated);
                  setEditingId(null);
                }}
              />
            </li>
          );
        }

        const start = task.start_time ?? task.due_time;
        const kindLabel = KIND_LABEL[task.kind];
        return (
          <li
            key={task.id}
            className="flex items-center gap-3 py-3.5 border-b border-line group"
          >
            <input
              type="checkbox"
              className="checkbox"
              checked={task.is_completed}
              onChange={() => onToggle(task)}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm truncate ${
                  task.is_completed ? "line-through text-mute" : "text-bone"
                }`}
              >
                {task.title}
              </p>
              {kindLabel && (
                <p className="text-xs text-mute">{kindLabel}</p>
              )}
            </div>
            {start && (
              <span className="text-xs text-ember tabular-nums">
                {start.slice(0, 5)}
                {task.end_time && ` - ${task.end_time.slice(0, 5)}`}
              </span>
            )}
            {onUpdate && (
              <button
                onClick={() => setEditingId(task.id)}
                className="text-xs text-mute md:opacity-0 md:group-hover:opacity-100 hover:text-bone transition-opacity px-1 py-2"
                aria-label="Editar tarefa"
              >
                Editar
              </button>
            )}
            <button
              onClick={() => handleDelete(task)}
              className="text-xs text-mute md:opacity-0 md:group-hover:opacity-100 hover:text-bone transition-opacity px-1 py-2"
              aria-label="Excluir tarefa"
            >
              Excluir
            </button>
          </li>
        );
      })}
    </ul>
  );
}