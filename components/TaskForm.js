"use client";

import { useState } from "react";

const KINDS = [
  { key: "tarefa", label: "Tarefa" },
  { key: "compromisso", label: "Compromisso" },
  { key: "lembrete", label: "Lembrete" },
];

export default function TaskForm({ defaultDate, onCreate, compact = false }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("tarefa");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function reset() {
    setTitle("");
    setKind("tarefa");
    setStartTime("");
    setEndTime("");
    setError("");
    setOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    if (endTime && !startTime) {
      setError("Defina o horário de início antes do fim.");
      return;
    }
    if (endTime && endTime <= startTime) {
      setError("O fim precisa ser depois do início.");
      return;
    }
    await onCreate({
      title: title.trim(),
      due_date: defaultDate,
      due_time: startTime || null,
      start_time: startTime || null,
      end_time: endTime || null,
      kind,
    });
    reset();
  }

  if (!open) {
    if (compact) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-line text-xs text-bone hover:border-ember/40 hover:text-ember transition-colors"
        >
          <span className="text-ember text-base leading-none">+</span>
          Adicionar
        </button>
      );
    }
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
      className="flex flex-col gap-4 rounded-lg border border-ember/40 bg-panel p-4"
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que você precisa fazer?"
        className="text-sm bg-transparent text-bone border-b border-line pb-2 focus:outline-none focus:border-ember/60"
      />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="radio"
            aria-checked={kind === k.key}
            onClick={() => setKind(k.key)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              kind === k.key
                ? "border-ember text-ember bg-ember/10"
                : "border-line text-mute hover:text-bone"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-mute">
          Início
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setError("");
            }}
            className="text-sm bg-transparent text-bone border border-line rounded px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mute">
          Fim
          <input
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setError("");
            }}
            className="text-sm bg-transparent text-bone border border-line rounded px-2 py-1.5"
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="tracked bg-ember text-ink text-sm px-4 py-2 rounded font-medium hover:bg-ember/90 transition-colors"
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-mute hover:text-bone"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}