"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const KINDS = [
  { key: "tarefa", label: "Tarefa" },
  { key: "compromisso", label: "Compromisso" },
  { key: "lembrete", label: "Lembrete" },
];

const hhmm = (t) => (t ? t.slice(0, 5) : "");

export default function TaskEditor({ task, onSaved, onCancel }) {
  const [title, setTitle] = useState(task.title);
  const [kind, setKind] = useState(task.kind || "tarefa");
  const [date, setDate] = useState(task.due_date);
  const [startTime, setStartTime] = useState(hhmm(task.start_time ?? task.due_time));
  const [endTime, setEndTime] = useState(hhmm(task.end_time));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Dê um nome para a tarefa.");
      return;
    }
    if (!date) {
      setError("Escolha uma data.");
      return;
    }
    if (endTime && !startTime) {
      setError("Defina o horário de início antes do fim.");
      return;
    }
    if (endTime && endTime <= startTime) {
      setError("O fim precisa ser depois do início.");
      return;
    }
    setSaving(true);
    const { data, error: updateError } = await supabase
      .from("tasks")
      .update({
        title: title.trim(),
        kind,
        due_date: date,
        due_time: startTime || null,
        start_time: startTime || null,
        end_time: endTime || null,
      })
      .eq("id", task.id)
      .select()
      .single();
    setSaving(false);
    if (updateError || !data) {
      setError("Não consegui salvar. Tente de novo.");
      return;
    }
    onSaved(data);
  }

  const inputClass =
    "text-sm bg-transparent text-bone border border-line rounded px-2 py-1.5";

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
          Data
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setError("");
            }}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mute">
          Início
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setError("");
            }}
            className={inputClass}
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
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="tracked bg-ember text-ink text-sm px-4 py-2 rounded font-medium hover:bg-ember/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-mute hover:text-bone"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}