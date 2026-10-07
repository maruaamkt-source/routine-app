"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toISODate, todayISO, habitAppliesOnISO } from "@/lib/dateUtils";

const WEEKS = 20;
const CELL = 14;
const GAP = 3;
const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const ROW_LABELS = ["Seg", "", "Qua", "", "Sex", "", ""];

const LEVEL_COLORS = [
  "rgb(var(--bone) / 0.07)",
  "rgb(var(--ember) / 0.28)",
  "rgb(var(--ember) / 0.5)",
  "rgb(var(--ember) / 0.75)",
  "rgb(var(--ember) / 1)",
];

function levelFor(ratio) {
  if (ratio <= 0) return 0;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatBR(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export default function HabitHeatmap({ habits, habitLogs }) {
  const scrollRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const todayIso = todayISO();

  const weeks = useMemo(() => {
    // Quais hábitos foram feitos em cada dia
    const doneByDate = {};
    habitLogs.forEach((l) => {
      if (!l.completed) return;
      if (!doneByDate[l.date]) doneByDate[l.date] = new Set();
      doneByDate[l.date].add(l.habit_id);
    });

    // Segunda-feira da semana atual
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + diffToMonday);

    const start = new Date(thisMonday);
    start.setDate(start.getDate() - 7 * (WEEKS - 1));

    const result = [];
    for (let w = 0; w < WEEKS; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const iso = toISODate(date);
        const future = iso > todayIso;

        let possible = 0;
        let done = 0;
        if (!future) {
          habits.forEach((h) => {
            const createdIso = h.created_at ? h.created_at.slice(0, 10) : "0000-00-00";
            if (createdIso > iso) return;
            if (!habitAppliesOnISO(h, iso)) return;
            possible += 1;
            if (doneByDate[iso] && doneByDate[iso].has(h.id)) done += 1;
          });
        }
        const ratio = possible ? Math.min(1, done / possible) : 0;
        days.push({ iso, future, possible, done, level: levelFor(ratio) });
      }
      result.push({ monday: days[0].iso, days });
    }
    return result;
  }, [habits, habitLogs, todayIso]);

  // Começa mostrando o lado mais recente (direita)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  function monthLabel(week, index) {
    const month = Number(week.monday.slice(5, 7)) - 1;
    if (index === 0) return MONTH_NAMES[month];
    const prevMonth = Number(weeks[index - 1].monday.slice(5, 7)) - 1;
    return month !== prevMonth ? MONTH_NAMES[month] : "";
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5 mb-8 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs tracking-wide text-mute uppercase">Constância</h2>
        <div className="flex items-center gap-1.5 text-[11px] text-mute">
          <span>Menos</span>
          {LEVEL_COLORS.map((c, i) => (
            <span
              key={i}
              style={{ width: 10, height: 10, background: c, borderRadius: 3 }}
            />
          ))}
          <span>Mais</span>
        </div>
      </div>

      <div className="flex gap-2 min-w-0">
        {/* Nomes dos dias da semana */}
        <div className="flex flex-col shrink-0" style={{ gap: GAP }}>
          <span style={{ height: 14 }} />
          {ROW_LABELS.map((label, i) => (
            <span
              key={i}
              className="text-[10px] text-mute leading-none flex items-center"
              style={{ height: CELL }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grade (rola pro lado dentro do card) */}
        <div ref={scrollRef} className="overflow-x-auto min-w-0 flex-1 pb-1">
          <div className="flex w-max" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div key={week.monday} className="flex flex-col" style={{ gap: GAP }}>
                <span
                  className="text-[10px] text-mute leading-none"
                  style={{ height: 14 }}
                >
                  {monthLabel(week, wi)}
                </span>
                {week.days.map((d) =>
                  d.future ? (
                    <span key={d.iso} style={{ width: CELL, height: CELL }} />
                  ) : (
                    <button
                      key={d.iso}
                      onClick={() => setSelected(d)}
                      title={`${formatBR(d.iso)}: ${d.done} de ${d.possible}`}
                      aria-label={`${formatBR(d.iso)}: ${d.done} de ${d.possible} hábitos`}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 3,
                        background: LEVEL_COLORS[d.level],
                        outline:
                          d.iso === todayIso
                            ? "1.5px solid rgb(var(--ember))"
                            : selected && selected.iso === d.iso
                            ? "1.5px solid rgb(var(--bone) / 0.6)"
                            : "none",
                        outlineOffset: 1,
                      }}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-mute mt-3 min-h-[1rem]">
        {selected
          ? selected.possible > 0
            ? `${formatBR(selected.iso)}: ${selected.done} de ${selected.possible} hábitos`
            : `${formatBR(selected.iso)}: nenhum hábito previsto`
          : "Toque num quadradinho para ver o dia."}
      </p>
    </div>
  );
}