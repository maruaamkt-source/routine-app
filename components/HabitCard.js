"use client";

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

export default function HabitCard({ habit, logs, doneToday, streak, onToggleToday, onDelete }) {
  const completedDates = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  const days = last7Days();

  return (
    <div className="flex items-center gap-4 py-4 border-b border-line last:border-0 group">
      <input
        type="checkbox"
        className="checkbox"
        checked={doneToday}
        onChange={() => onToggleToday(habit)}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-bone mb-2 truncate">{habit.name}</p>
        <div className="flex gap-1">
          {days.map((d, i) => {
            const iso = toISODate(d);
            const done = completedDates.has(iso);
            return (
              <span
                key={iso}
                title={WEEKDAY_LABELS[(d.getDay() + 6) % 7]}
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] transition-colors ${
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
          <p className="text-[11px] text-mute whitespace-nowrap">
            {streak === 1 ? "dia seguido" : "dias seguidos"}
          </p>
        </div>
      </div>

      <button
        onClick={() => onDelete(habit)}
        className="text-xs text-mute opacity-0 group-hover:opacity-100 hover:text-bone transition-opacity ml-2"
        aria-label="Excluir hábito"
      >
        Excluir
      </button>
    </div>
  );
}