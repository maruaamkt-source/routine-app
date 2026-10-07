"use client";

import { useState } from "react";
import { toISODate, WEEKDAY_LABELS } from "@/lib/dateUtils";

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export default function HabitCard({
  habit,
  logs,
  doneToday,
  streak,
  onToggleToday,
  onDelete,
  onUpdate,
}) {
  const completedDates = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  const days = last7Days();
  const start = habit.start_time ? habit.start_time.slice(0, 5) : "";
  const end = habit.end_time ? habit.end_time.slice(0, 5) : "";

  const [editing, setEditing] = useState(false);
  const [startTime, setStartTime] = useState(start);
  const [endTime, setEndTime] = useState(end);
  const [error, setError] = useState("");

  function openEditor() {
    setStartTime(start);
    setEndTime(end);
    setError("");
    setEditing(true);
  }

  async function save() {
    if (endTime && !startTime) {
      setError("Defina o início antes do fim.");
      return;
    }
    if (endTime && endTime <= startTime) {
      setError("O fim precisa ser depois do início.");
      return;
    }
    await onUpdate(habit, {
      start_time: startTime || null,
      end_time: endTime || null,
    });
    setEditing(false);
  }

  return (
    <div className="py-4 border-b border-line last:border-0 group">
      <div className="flex items-center gap-3 md:gap-4">
        <input
          type="checkbox"
          className="checkbox shrink-0"
          checked={doneToday}
          onChange={() => onToggleToday(habit)}
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-bone truncate">{habit.name}</p>
          {onUpdate && (
            <button
              onClick={openEditor}
              className={`text-xs tabular-nums mb-2 transition-colors ${
                start ? "text-ember" : "text-mute hover:text-bone"
              }`}
            >
              {start ? `${start}${end ? ` - ${end}` : ""}` : "+ horário"}
            </button>
          )}
          <div className={`flex gap-1 ${onUpdate ? "" : "mt-2"}`}>
            {days.map((d) => {
              const iso = toISODate(d);
              const done = completedDates.has(iso);
              return (
                <span
                  key={iso}
                  title={WEEKDAY_LABELS[(d.getDay() + 6) % 7]}
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 rounded-full flex items-center justify-center text-[8px] transition-colors ${
                    done ? "bg-ember text-ink" : "bg-surface border border-line text-mute"
                  }`}
                >
                  {done ? "●" : ""}
                </span>
              );
            })}
          </div>
        </div>

        <div className="text-right flex items-center gap-1.5 shrink-0">
          {streak > 0 && <span className="text-ember text-sm">🔥</span>}
          <div>
            <p className="font-serif text-xl leading-none text-bone">{streak}</p>
            <p className="hidden md:block text-[11px] text-mute whitespace-nowrap">
              {streak === 1 ? "dia seguido" : "dias seguidos"}
            </p>
          </div>
        </div>

        <button
          onClick={() => onDelete(habit)}
          className="shrink-0 text-xs text-mute md:opacity-0 md:group-hover:opacity-100 hover:text-bone transition-opacity md:ml-2 px-2 py-2"
          aria-label="Excluir hábito"
        >
          <span className="md:hidden">✕</span>
          <span className="hidden md:inline">Excluir</span>
        </button>
      </div>

      {editing && (
        <div className="mt-3 ml-0 md:ml-8 flex flex-wrap items-end gap-3 rounded-md border border-ember/30 bg-white/[0.03] p-3">
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
          <div className="flex items-center gap-3 pb-1.5">
            <button
              onClick={save}
              className="bg-ember text-ink text-xs px-3 py-1.5 rounded font-medium hover:bg-ember/90 transition-colors"
            >
              Salvar
            </button>
            {(start || end) && (
              <button
                onClick={async () => {
                  await onUpdate(habit, { start_time: null, end_time: null });
                  setEditing(false);
                }}
                className="text-xs text-mute hover:text-bone"
              >
                Remover horário
              </button>
            )}
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-mute hover:text-bone"
            >
              Cancelar
            </button>
          </div>
          {error && <p className="w-full text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}