"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import ProgressRing from "@/components/ProgressRing";
import TaskForm from "@/components/TaskForm";
import TaskEditor from "@/components/TaskEditor";
import { toISODate, todayISO, habitAppliesOnISO } from "@/lib/dateUtils";
import { getRandomQuote } from "@/lib/quotes";
import { KIND_COLOR, tint } from "@/lib/kindColors";
import { deleteFutureOccurrences } from "@/lib/taskSeries";

const KIND_STYLE = {
  tarefa: { label: "Tarefa", plural: "Tarefas", color: KIND_COLOR.tarefa },
  habito: { label: "Hábito", plural: "Hábitos", color: KIND_COLOR.habito },
  compromisso: { label: "Compromisso", plural: "Compromissos", color: KIND_COLOR.compromisso },
  lembrete: { label: "Lembrete", plural: "Lembretes", color: KIND_COLOR.lembrete },
};

const toMin = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};
const hhmm = (t) => (t ? t.slice(0, 5) : "");
const slotLabel = (i) =>
  `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;

export default function DiaPage() {
  const { date } = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const today = todayISO();
  const quote = useMemo(() => getRandomQuote(), []);
  const scrollRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [menuKey, setMenuKey] = useState(null);
  const [editing, setEditing] = useState(null);

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "");

  const load = useCallback(async () => {
    if (!user || !validDate) return;
    setLoaded(false);
    const [t, h, l] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).eq("due_date", date),
      supabase.from("habits").select("*").eq("user_id", user.id),
      supabase.from("habit_logs").select("*").eq("user_id", user.id).eq("date", date),
    ]);
    setTasks(t.data ?? []);
    setHabits((h.data ?? []).filter((x) => habitAppliesOnISO(x, date)));
    setLogs(l.data ?? []);
    setLoaded(true);
  }, [user, date, validDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function createTask(newTask) {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...newTask, user_id: user.id })
      .select()
      .single();
    if (!error && data) setTasks((prev) => [...prev, data]);
  }

  async function toggleTask(task) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: !task.is_completed })
      .eq("id", task.id);
    if (!error)
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_completed: !t.is_completed } : t))
      );
  }

  async function deleteTask(task) {
    await deleteFutureOccurrences(task);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  function handleUpdate(updated) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)).filter((t) => t.due_date === date)
    );
    setEditing(null);
  }

  async function toggleHabit(habit) {
    const log = logs.find((l) => l.habit_id === habit.id);
    if (log) {
      const { error } = await supabase.from("habit_logs").delete().eq("id", log.id);
      if (!error) setLogs((prev) => prev.filter((l) => l.id !== log.id));
    } else {
      const { data, error } = await supabase
        .from("habit_logs")
        .insert({ habit_id: habit.id, user_id: user.id, date, completed: true })
        .select()
        .single();
      if (!error) setLogs((prev) => [...prev, data]);
    }
  }

  const items = useMemo(() => {
    const fromTasks = tasks.map((t) => ({
      key: `t-${t.id}`,
      kind: t.kind || "tarefa",
      title: t.title,
      start: t.start_time ?? t.due_time ?? null,
      end: t.end_time,
      done: t.is_completed,
      toggle: () => toggleTask(t),
      remove: () => deleteTask(t),
      edit: () => setEditing(t),
    }));
    const fromHabits = habits.map((h) => ({
      key: `h-${h.id}`,
      kind: "habito",
      title: h.name,
      start: h.start_time,
      end: h.end_time,
      done: logs.some((l) => l.habit_id === h.id),
      toggle: () => toggleHabit(h),
    }));
    return [...fromTasks, ...fromHabits].sort((a, b) =>
      (a.start ?? "99").localeCompare(b.start ?? "99")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, habits, logs]);

  const timed = items.filter((i) => i.start);
  const untimed = items.filter((i) => !i.start);
  const dayTasks = items.filter((i) => i.kind === "tarefa");

  const count = (kind) => {
    const list = items.filter((i) => i.kind === kind);
    return { done: list.filter((i) => i.done).length, total: list.length };
  };
  const tarefas = count("tarefa");
  const percent = tarefas.total ? Math.round((tarefas.done / tarefas.total) * 100) : 0;

  const nowMin = (() => {
    if (date !== today) return null;
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  })();

  useEffect(() => {
    if (!loaded || !scrollRef.current) return;
    const first = timed[0] ? Math.floor(toMin(timed[0].start) / 30) : null;
    const nowSlot = nowMin != null ? Math.floor(nowMin / 30) : null;
    const target = Math.max((first ?? nowSlot ?? 12) - 1, 0);
    const el = scrollRef.current.querySelector(`[data-slot="${target}"]`);
    if (el) scrollRef.current.scrollTop = el.offsetTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, date]);

  function goToDay(delta) {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + delta);
    router.push(`/calendario/${toISODate(d)}`);
  }

  if (loading || !user) return null;

  if (!validDate) {
    return (
      <div className="md:flex">
        <Nav />
        <main className="flex-1 px-6 py-10 md:px-12 md:py-14">
          <p className="text-mute mb-2">Data inválida.</p>
          <Link href="/calendario" className="text-ember text-sm">
            Voltar ao calendário
          </Link>
        </main>
      </div>
    );
  }

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const itemProps = (i) => ({
    item: i,
    menuOpen: menuKey === i.key,
    onMenu: () => setMenuKey(menuKey === i.key ? null : i.key),
    onClose: () => setMenuKey(null),
  });

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-4 py-8 md:px-12 md:py-12 pb-24 md:pb-12">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="min-w-0">
            <Link
              href="/calendario"
              className="inline-flex items-center gap-2 text-xs text-mute hover:text-bone transition-colors"
            >
              <span aria-hidden>←</span> Voltar
            </Link>
            <p className="text-xs md:text-sm text-ember uppercase tracking-wide mt-3 mb-1">
              {dateLabel}
            </p>
            <h1 className="font-serif text-2xl md:text-4xl text-bone mb-1">
              Seus compromissos do dia.
            </h1>
            <p className="text-sm text-mute">
              Aqui estão todas as suas tarefas, hábitos e compromissos do dia.
            </p>
          </div>
          <p className="hidden lg:block text-right text-sm italic text-mute max-w-xs leading-relaxed">
            "{quote.text}"
            <span className="block not-italic text-xs text-ember mt-1">
              — {quote.ref}
            </span>
          </p>
        </div>

        {/* Linha de cima: compacta */}
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-stretch mb-4">
          <div className="rounded-lg border border-line bg-panel p-4">
            <div className="flex items-center gap-4">
              <ProgressRing
                percent={percent}
                size={76}
                label={`${tarefas.done}/${tarefas.total}`}
                sublabel="tarefas"
              />
              <ul className="flex-1 flex flex-col gap-1 text-xs">
                {Object.keys(KIND_STYLE).map((k) => {
                  const c = count(k);
                  return (
                    <li key={k} className="flex items-center gap-2 text-mute">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: KIND_STYLE[k].color }}
                      />
                      <span className="flex-1">{KIND_STYLE[k].plural}</span>
                      <span className="tabular-nums">
                        {c.done}/{c.total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {dayTasks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-line">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xs text-mute">Tarefas do dia</h2>
                  <Link href="/calendar" className="text-xs text-ember">
                    Ver todas →
                  </Link>
                </div>
                <ul className="flex flex-col max-h-40 overflow-y-auto">
                  {dayTasks.map((t) => (
                    <li
                      key={t.key}
                      className="flex items-center gap-3 py-2 border-b border-line last:border-0"
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={t.done}
                        onChange={t.toggle}
                      />
                      <span
                        className={`text-sm flex-1 truncate ${
                          t.done ? "text-mute line-through" : "text-bone"
                        }`}
                      >
                        {t.title}
                      </span>
                      <span className="text-xs text-mute tabular-nums">
                        {hhmm(t.start)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-panel p-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm md:text-base text-bone truncate first-letter:uppercase">
                {dateLabel}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => goToDay(-1)}
                  aria-label="Dia anterior"
                  className="w-9 h-9 grid place-items-center rounded-md text-mute hover:text-bone hover:bg-white/5 transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() => router.push(`/calendario/${today}`)}
                  className="h-9 px-3 rounded-md bg-white/5 text-xs text-bone hover:bg-white/10 transition-colors"
                >
                  Hoje
                </button>
                <button
                  onClick={() => goToDay(1)}
                  aria-label="Próximo dia"
                  className="w-9 h-9 grid place-items-center rounded-md text-mute hover:text-bone hover:bg-white/5 transition-colors"
                >
                  ›
                </button>
              </div>
            </div>

            {untimed.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line">
                <p className="text-xs text-mute mb-2">
                  Sem horário · {untimed.filter((i) => i.done).length}/{untimed.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {untimed.map((i) => (
                    <Chip key={i.key} item={i} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-line">
              <TaskForm defaultDate={date} onCreate={createTask} compact />
            </div>
          </div>
        </div>

        {/* Linha do tempo: largura toda, bem alta */}
        <div className="rounded-lg border border-line bg-panel min-w-0 overflow-hidden">
          <div
            ref={scrollRef}
            className="relative h-[70vh] min-h-[26rem] overflow-y-auto overscroll-contain px-4 md:px-6 py-2"
          >
            {Array.from({ length: 48 }, (_, s) => {
              const slotStart = s * 30;
              const isHour = s % 2 === 0;
              const starting = timed.filter((i) => {
                const m = toMin(i.start);
                return m >= slotStart && m < slotStart + 30;
              });
              const covering = timed.find((i) => {
                const a = toMin(i.start);
                const b = i.end ? toMin(i.end) : a + 30;
                return a < slotStart && b > slotStart;
              });
              const hasNow =
                nowMin != null && nowMin >= slotStart && nowMin < slotStart + 30;
              return (
                <div
                  key={s}
                  data-slot={s}
                  className={`relative flex items-start gap-3 md:gap-5 py-1.5 border-b ${
                    isHour ? "border-line" : "border-line/40"
                  } last:border-0`}
                >
                  {hasNow && (
                    <span
                      className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                      style={{ top: `${((nowMin - slotStart) / 30) * 100}%` }}
                    >
                      <span className="w-2 h-2 rounded-full bg-ember -ml-1" />
                      <span className="flex-1 h-px bg-ember/70" />
                    </span>
                  )}
                  <span
                    className={`w-11 md:w-12 shrink-0 text-xs tabular-nums pt-1 ${
                      isHour ? "text-bone/70" : "text-mute/60"
                    }`}
                  >
                    {slotLabel(s)}
                  </span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    {starting.length > 0 ? (
                      starting.map((i) => (
                        <TimelineItem key={i.key} {...itemProps(i)} />
                      ))
                    ) : covering ? (
                      <span
                        className="block h-6 w-[3px] rounded-full ml-0.5"
                        style={{
                          backgroundColor: tint(KIND_STYLE[covering.kind].color, 27),
                        }}
                      />
                    ) : (
                      <span className="block h-6 pt-1 text-[11px] text-mute/40">
                        Livre
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {editing && (
          <div
            className="fixed inset-0 z-40 grid place-items-center bg-ink/70 p-4"
            onClick={() => setEditing(null)}
          >
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <TaskEditor
                task={editing}
                onSaved={handleUpdate}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>
        )}

        {menuKey && (
          <div className="fixed inset-0 z-20" onClick={() => setMenuKey(null)} />
        )}
      </main>
    </div>
  );
}

function KindIcon({ kind, size = 15 }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (kind === "habito")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  if (kind === "compromisso")
    return (
      <svg {...p}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </svg>
    );
  if (kind === "lembrete")
    return (
      <svg {...p}>
        <path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4z" />
        <path d="M10 21h4" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

function Chip({ item }) {
  const style = KIND_STYLE[item.kind] ?? KIND_STYLE.tarefa;
  const titleClass = `text-xs ${item.done ? "text-mute line-through" : "text-bone"}`;
  return (
    <div
      className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors"
      style={{
        borderColor: tint(style.color, item.done ? 13 : 33),
        backgroundColor: item.done ? "transparent" : tint(style.color, 6),
      }}
    >
      <button
        onClick={item.toggle}
        aria-label={`${item.done ? "Reabrir" : "Concluir"} ${item.title}`}
        className="shrink-0 grid place-items-center w-6 h-6 rounded-full transition-colors"
        style={{
          color: item.done ? "rgb(var(--ink))" : style.color,
          backgroundColor: item.done ? style.color : "transparent",
        }}
      >
        <KindIcon kind={item.kind} size={12} />
      </button>
      {item.edit ? (
        <button
          onClick={item.edit}
          aria-label={`Editar ${item.title}`}
          className={`${titleClass} text-left hover:underline`}
        >
          {item.title}
        </button>
      ) : (
        <span className={titleClass}>{item.title}</span>
      )}
      {item.remove && (
        <button
          onClick={item.remove}
          aria-label={`Excluir ${item.title}`}
          className="text-mute hover:text-bone text-xs leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}

function TimelineItem({ item, menuOpen, onMenu, onClose }) {
  const style = KIND_STYLE[item.kind] ?? KIND_STYLE.tarefa;
  return (
    <div
      className="relative flex items-center gap-3 rounded-md bg-white/[0.04] hover:bg-white/[0.07] transition-colors pl-3 pr-1 py-1.5"
      style={{ borderLeft: `3px solid ${style.color}` }}
    >
      <button
        onClick={item.toggle}
        aria-label={`${item.done ? "Reabrir" : "Concluir"} ${item.title}`}
        className="shrink-0 grid place-items-center w-7 h-7 rounded-full border transition-colors"
        style={{
          color: item.done ? "#0a0a0a" : style.color,
          backgroundColor: item.done ? style.color : "transparent",
          borderColor: tint(style.color, 40),
        }}
      >
        <KindIcon kind={item.kind} />
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            item.done ? "text-mute line-through" : "text-bone"
          }`}
        >
          {item.title}
        </p>
        <p className="text-xs text-mute truncate">
          {style.label}
          {item.start &&
            ` • ${hhmm(item.start)}${item.end ? ` - ${hhmm(item.end)}` : ""}`}
        </p>
      </div>

      <button
        onClick={onMenu}
        aria-label="Mais opções"
        className="shrink-0 w-9 h-9 grid place-items-center text-mute hover:text-bone transition-colors"
      >
        ···
      </button>

      {menuOpen && (
         <div className="absolute right-2 top-11 z-30 w-40 rounded-md border border-line bg-panel py-1 shadow-lg">
          {item.edit && (
            <button
              onClick={() => {
                item.edit();
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-sm text-bone hover:bg-white/5"
            >
              Editar
            </button>
          )}
          <button
            onClick={() => {
              item.toggle();
              onClose();
            }}
            className="w-full text-left px-3 py-2 text-sm text-bone hover:bg-white/5"
          >
            {item.done ? "Reabrir" : "Concluir"}
          </button>
          {item.remove && (
            <button
              onClick={() => {
                item.remove();
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5"
            >
              Excluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}