"use client";

export default function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-mute py-6">
        Nenhuma tarefa aqui ainda. Que tal adicionar a primeira?
      </p>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    if (!a.due_time) return 1;
    if (!b.due_time) return -1;
    return a.due_time.localeCompare(b.due_time);
  });

  return (
    <ul className="flex flex-col">
      {sorted.map((task) => (
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
          <div className="flex-1">
            <p
              className={`text-sm ${
                task.is_completed ? "line-through text-mute" : "text-bone"
              }`}
            >
              {task.title}
            </p>
          </div>
          {task.due_time && (
            <span className="text-xs text-ember tabular-nums">
              {task.due_time.slice(0, 5)}
            </span>
          )}
          <button
            onClick={() => onDelete(task)}
            className="text-xs text-mute opacity-0 group-hover:opacity-100 hover:text-bone transition-opacity"
            aria-label="Excluir tarefa"
          >
            Excluir
          </button>
        </li>
      ))}
    </ul>
  );
}