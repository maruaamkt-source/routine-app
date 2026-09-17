"use client";

import { useState } from "react";

export default function TaskForm({ defaultDate, onCreate }) {
  const [title, setTitle] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await onCreate({
      title: title.trim(),
      due_date: defaultDate,
      due_time: dueTime || null,
    });
    setTitle("");
    setDueTime("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full text-left px-5 py-4 rounded-lg border border-line bg-panel hover:border-ember/40 transition-colors"
      >
        <span className="text-ember text-lg leading-none">+</span>
        <span className="text-sm text-bone/80 flex-1">Adicionar uma tarefa</span>
        <span className="text-mute">→</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-ember/40 bg-panel p-4"
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que você precisa fazer?"
        className="text-sm bg-transparent text-bone border-b border-line pb-2 focus:outline-none focus:border-ember/60"
      />
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          className="text-sm bg-transparent text-bone border border-line rounded px-2 py-1.5"
        />
        <button
          type="submit"
          className="tracked bg-ember text-ink text-sm px-4 py-1.5 ml-auto rounded font-medium hover:bg-ember/90 transition-colors"
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-mute hover:text-bone"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}