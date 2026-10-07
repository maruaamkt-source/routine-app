"use client";

import { formatDayLabel, toISODate, WEEKDAY_LABELS } from "@/lib/dateUtils";

export default function WeekCalendar({
  weekDates,
  tasksByDate,
  selectedDate,
  onSelectDate,
}) {
  const todayIso = toISODate(new Date());

  return (
    <div className="grid grid-cols-7 gap-1.5 md:gap-3">
      {weekDates.map((date, i) => {
        const iso = toISODate(date);
        const isSelected = iso === selectedDate;
        const isToday = iso === todayIso;

        return (
          <button
            key={iso}
            onClick={() => onSelectDate(iso)}
            className={`relative min-w-0 rounded-lg border px-1 pt-2.5 pb-4 md:px-4 md:py-4 text-center md:text-left transition-colors ${
              isSelected
                ? "border-ember/60 bg-emberSoft"
                : "border-line bg-panel hover:border-ember/30"
            }`}
          >
            <p
              className={`text-[11px] md:text-xs mb-1 ${
                isSelected ? "text-ember" : "text-mute"
              }`}
            >
              {WEEKDAY_LABELS[i]}
            </p>
            <p
              className={`text-sm font-medium ${
                isSelected ? "text-bone" : "text-bone/80"
              }`}
            >
              <span className="md:hidden">
                {String(date.getDate()).padStart(2, "0")}
              </span>
              <span className="hidden md:inline">{formatDayLabel(date)}</span>
            </p>
            {isToday && (
              <span className="absolute bottom-1.5 md:bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ember" />
            )}
          </button>
        );
      })}
    </div>
  );
}