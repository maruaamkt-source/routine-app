"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import { toISODate, todayISO, habitAppliesOnISO } from "@/lib/dateUtils";
import { getRandomQuote } from "@/lib/quotes";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const KINDS = [
  { key: "tarefa", label: "Tarefa", color: "#d9a441" },
  { key: "habito", label: "Hábito", color: "#6fae7b" },
  { key: "compromisso", label: "Compromisso", color: "#6b8fd6" },
  { key: "lembrete", label: "Lembrete", color: "#9a82c9" },
];
const COLOR = Object.fromEntries(KINDS.map((k) => [k.key, k.color]));

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function buildWeek(anchor) {
  const offset = (anchor.getDay() + 6) % 7;
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function CalendarioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const today = todayISO();
  const quote = useMemo(() => getRandomQuote(), []);

  const [view, setView] = useState("mes");
  const [anchor, setAnchor] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const week = useMemo(() => buildWeek(anchor), [anchor]);

  const rangeStart = toISODate(view === "mes" ? grid[0] : week[0]);
  const rangeEnd = toISODate(view === "mes" ? grid[41] : week[6]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tasks")
      .select("id, title, due_date, due_time, start_time, kind, is_completed")
      .eq("user_id", user.id)
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd)
      .then(({ data, error }) => {
        if (!error) setTasks(data ?? []);
      });
  }, [user, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!error) setHabits(data ?? []);
      });
  }, [user]);

  const byDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!map[t.due_date]) map[t.due_date] = { kinds: new Set(), tarefas: 0, list: [] };
      const kind = t.kind || "tarefa";
      map[t.due_date].kinds.add(kind);
      if (kind === "tarefa") map[t.due_date].tarefas += 1;
      map[t.due_date].list.push(t);
    });
    Object.values(map).forEach((d) =>
      d.list.sort((a, b) =>
        (a.start_time ?? a.due_time ?? "99").localeCompare(b.start_time ?? b.due_time ?? "99")
      )
    );
    return map;
  }, [tasks]);

  function habitsOn(iso) {
    return habits.filter((h) => habitAppliesOnISO(h, iso)).length;
  }

  function dotsFor(iso) {
    const kinds = new Set(byDate[iso]?.kinds ?? []);
    if (habitsOn(iso) > 0) kinds.add("habito");
    return KINDS.filter((k) => kinds.has(k.key));
  }

  const upcoming = Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  if (loading || !user) return null;

  function move(delta) {
    if (view === "mes") setAnchor(new Date(year, month + delta, 1));
    else {
      const d = new Date(anchor);
      d.setDate(d.getDate() + delta * 7);
      setAnchor(d);
    }
  }

  function chooseView(v) {
    if (v === "dia") {
      router.push(`/calendario/${today}`);
      return;
    }
    setView(v);
  }

  const title =
    view === "mes"
      ? anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : `${week[0].getDate()} ${
          week[0].getMonth() !== week[6].getMonth()
            ? week[0].toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
            : ""
        } – ${week[6].getDate()} de ${week[6].toLocaleDateString("pt-BR", {
          month: "long",
        })} de ${week[6].getFullYear()}`.replace("  ", " ");

  const openDay = (iso) => router.push(`/calendario/${iso}`);

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-4 py-8 md:px-12 md:py-14 pb-24 md:pb-14">
        <div className="flex items-start justify-between mb-6 md:mb-8">
          <div>
            <p className="text-sm text-ember uppercase tracking-wide mb-1">Calendário</p>
            <h1 className="font-serif text-2xl md:text-4xl text-bone mb-1">
              Sua rotina em visão completa.
            </h1>
            <p className="text-sm text-mute">
              Veja todos os seus compromissos e tarefas em um só lugar.
            </p>
          </div>
          <p className="hidden lg:block text-right text-sm italic text-mute max-w-xs leading-relaxed">
            "{quote.text}"
            <span className="block not-italic text-xs text-ember mt-1">— {quote.ref}</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-4">
          <div className="rounded-lg border border-line bg-panel overflow-hidden min-w-0">
            {/* Barra de topo */}
            <div className="flex items-center gap-2 px-3 md:px-4 py-3 border-b border-line">
              <button
                onClick={() => move(-1)}
                aria-label="Anterior"
                className="w-9 h-9 grid place-items-center text-mute hover:text-bone transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() => move(1)}
                aria-label="Próximo"
                className="w-9 h-9 grid place-items-center text-mute hover:text-bone transition-colors"
              >
                ›
              </button>
              <p className="flex-1 min-w-0 truncate text-sm md:text-base text-bone first-letter:uppercase">
                {title}
              </p>
              <div
                role="tablist"
                className="flex rounded-md border border-line p-0.5 shrink-0"
              >
                {[
                  ["mes", "Mês"],
                  ["semana", "Semana"],
                  ["dia", "Dia"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => chooseView(key)}
                    className={`px-2.5 md:px-3 h-8 rounded text-xs transition-colors ${
                      view === key
                        ? "bg-ember/15 text-ember ring-1 ring-ember/60"
                        : "text-mute hover:text-bone"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view === "mes" ? (
              <>
                <div className="grid grid-cols-7 border-b border-line">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="py-2 text-center text-xs text-mute">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {grid.map((date, i) => {
                    const iso = toISODate(date);
                    const inMonth = date.getMonth() === month;
                    const isToday = iso === today;
                    const dots = dotsFor(iso);
                    return (
                      <button
                        key={iso}
                        onClick={() => openDay(iso)}
                        className={`h-16 md:h-24 p-1.5 md:p-2 text-left border-b border-r border-line transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ember ${
                          i % 7 === 6 ? "border-r-0" : ""
                        } ${i >= 35 ? "border-b-0" : ""} ${
                          isToday ? "bg-ember/10 ring-1 ring-inset ring-ember" : ""
                        }`}
                      >
                        <span className={`text-sm ${inMonth ? "text-bone" : "text-mute/40"}`}>
                          {date.getDate()}
                        </span>
                        {inMonth && dots.length > 0 && (
                          <span className="flex flex-wrap gap-1 mt-1.5 md:mt-2">
                            {dots.map((k) => (
                              <span
                                key={k.key}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: k.color }}
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="grid md:grid-cols-7 md:min-h-[26rem]">
                {week.map((date, i) => {
                  const iso = toISODate(date);
                  const isToday = iso === today;
                  const list = byDate[iso]?.list ?? [];
                  const nHabits = habitsOn(iso);
                  const shown = list.slice(0, 4);
                  const extra = list.length - shown.length;
                  return (
                    <button
                      key={iso}
                      onClick={() => openDay(iso)}
                      className={`flex flex-col gap-1.5 p-3 text-left border-line hover:bg-white/5 transition-colors border-b md:border-b-0 ${
                        i < 6 ? "md:border-r" : ""
                      } ${isToday ? "bg-ember/10" : ""}`}
                    >
                      <span className="flex items-baseline gap-2 md:block">
                        <span className="text-xs text-mute">{WEEKDAYS[i]}</span>
                        <span
                          className={`text-lg md:block ${
                            isToday ? "text-ember" : "text-bone"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                      </span>

                      {shown.map((t) => (
                        <span
                          key={t.id}
                          className="flex items-center gap-1.5 text-xs min-w-0"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLOR[t.kind || "tarefa"] }}
                          />
                          <span
                            className={`truncate ${
                              t.is_completed ? "text-mute line-through" : "text-bone/90"
                            }`}
                          >
                            {t.title}
                          </span>
                        </span>
                      ))}
                      {extra > 0 && <span className="text-xs text-mute">+{extra}</span>}
                      {nHabits > 0 && (
                        <span className="flex items-center gap-1.5 text-xs text-mute mt-auto">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: COLOR.habito }}
                          />
                          {nHabits} {nHabits === 1 ? "hábito" : "hábitos"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-sm text-bone mb-3">Legenda</h2>
              <ul className="flex flex-col gap-2">
                {KINDS.map((k) => (
                  <li key={k.key} className="flex items-center gap-2 text-xs text-mute">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: k.color }} />
                    {k.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-sm text-bone mb-3">Próximos dias</h2>
              <ul className="flex flex-col gap-2">
                {upcoming.map((d) => {
                  const iso = toISODate(d);
                  const tarefas = byDate[iso]?.tarefas ?? 0;
                  const nHabitos = habitsOn(iso);
                  return (
                    <li key={iso}>
                      <button
                        onClick={() => openDay(iso)}
                        className="w-full flex items-center gap-3 rounded-md border border-line px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                      >
                        <span className="text-bone w-14">
                          {String(d.getDate()).padStart(2, "0")}{" "}
                          <span className="text-xs text-mute capitalize">
                            {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                          </span>
                        </span>
                        <span className="flex-1 text-xs text-mute">
                          {tarefas} {tarefas === 1 ? "tarefa" : "tarefas"} • {nHabitos}{" "}
                          {nHabitos === 1 ? "hábito" : "hábitos"}
                        </span>
                        <span className="text-mute">›</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}