"use client";

import { useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/dateUtils";

export default function HabitForm({ onCreate }) {
  const [name, setName] = useState("");
  const [everyDay, setEveryDay] = useState(true);
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function toggleDay(index) {
    setSelectedDays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index]
    );
  }

  function reset() {
    setName("");
    setEveryDay(true);
    setSelectedDays([]);
    setStartTime("");
    setEndTime("");
    setError("");
    setOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (endTime && !startTime) {
      setError("Defina o horário de início antes do fim.");
      return;
    }
    if (endTime && endTime <= startTime) {
      setError("O fim precisa ser depois do início.");
      return;
    }
    const days_of_week = everyDay || selectedDays.length === 0 ? null : selectedDays;
    await onCreate(name.trim(), days_of_week, {
      start_time: startTime || null,
      end_time: endTime || null,
    });
    reset();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full text-left px-5 py-4 rounded-lg border border-line bg-panel hover:border-ember/40 transition-colors"
      >
        <span className="text-ember text-lg leading-none">+</span>
        <span className="text-sm text-bone/80 flex-1">Adicionar novo hábito</span>
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
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: Beber 2L de água"
        className="text-sm bg-transparent text-bone focus:outline-none border-b border-line pb-2"
      />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={everyDay}
            onChange={(e) => setEveryDay(e.target.checked)}
          />
          <span className="text-sm text-bone">Todos os dias</span>
        </div>

        {!everyDay && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {WEEKDAY_LABELS.map((label, index) => {
              const active = selectedDays.includes(index);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "border-ember/60 bg-emberSoft text-ember"
                      : "border-line text-mute hover:text-bone"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-mute">
          Início (opcional)
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
          Fim (opcional)
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

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="tracked bg-ember text-ink text-sm px-4 py-1.5 rounded font-medium hover:bg-ember/90 transition-colors"
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