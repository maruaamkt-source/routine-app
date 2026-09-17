"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import ProgressRing from "@/components/ProgressRing";
import { toISODate, habitAppliesOnISO } from "@/lib/dateUtils";

const WEEKS_BACK = 8;
const MONTHS_BACK = 6;

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeekPeriods(today) {
  const thisMonday = mondayOf(today);
  const periods = [];
  for (let i = 0; i < WEEKS_BACK; i++) {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - 7 * i);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    periods.push({
      key: toISODate(start),
      start,
      end,
      label: `${start.getDate().toString().padStart(2, "0")}/${(start.getMonth() + 1)
        .toString()
        .padStart(2, "0")} - ${end.getDate().toString().padStart(2, "0")}/${(
        end.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`,
      isCurrent: i === 0,
    });
  }
  return periods;
}

function buildMonthPeriods(today) {
  const periods = [];
  for (let i = 0; i < MONTHS_BACK; i++) {
    const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    periods.push({
      key: toISODate(start),
      start,
      end,
      label: ref
        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        .replace(/^\w/, (c) => c.toUpperCase()),
      isCurrent: i === 0,
    });
  }
  return periods;
}

// Lista todas as datas (Date objects) dentro do período, limitadas até hoje
function datesElapsedInPeriod(start, end, today) {
  const dates = [];
  const cursor = new Date(start);
  const limit = end < today ? end : today;
  while (cursor <= limit) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [view, setView] = useState("weeks");
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [fetching, setFetching] = useState(true);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const earliestNeeded = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() - MONTHS_BACK, 1);
    return toISODate(d);
  }, [today]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [tasksRes, habitsRes, logsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .gte("due_date", earliestNeeded),
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase.from("habit_logs").select("*").eq("user_id", user.id),
    ]);

    if (!tasksRes.error) setTasks(tasksRes.data ?? []);
    if (!habitsRes.error) setHabits(habitsRes.data ?? []);
    if (!logsRes.error) setHabitLogs(logsRes.data ?? []);
    setFetching(false);
  }, [user, earliestNeeded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const weekPeriods = useMemo(() => buildWeekPeriods(today), [today]);
  const monthPeriods = useMemo(() => buildMonthPeriods(today), [today]);
  const periods = view === "weeks" ? weekPeriods : monthPeriods;

  const stats = useMemo(() => {
    return periods.map((p) => {
      const startISO = toISODate(p.start);
      const endISO = toISODate(p.end);

      const periodTasks = tasks.filter(
        (t) => t.due_date >= startISO && t.due_date <= endISO
      );
      const tasksTotal = periodTasks.length;
      const tasksDone = periodTasks.filter((t) => t.is_completed).length;

      const periodLogs = habitLogs.filter(
        (l) => l.completed && l.date >= startISO && l.date <= endISO
      );
      const habitsDone = periodLogs.length;

      // Conta, dia a dia, quantos hábitos se aplicavam naquele dia
      const elapsedDates = datesElapsedInPeriod(p.start, p.end, today);
      let habitsPossible = 0;
      elapsedDates.forEach((date) => {
        const iso = toISODate(date);
        habits.forEach((h) => {
          if (habitAppliesOnISO(h, iso)) habitsPossible += 1;
        });
      });

      const totalDone = tasksDone + habitsDone;
      const totalPossible = tasksTotal + habitsPossible;
      const percent = totalPossible
        ? Math.round((totalDone / totalPossible) * 100)
        : 0;

      return { ...p, tasksDone, tasksTotal, habitsDone, habitsPossible, percent };
    });
  }, [periods, tasks, habitLogs, habits, today]);

  if (loading || !user) return null;

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 px-6 py-10 md:px-12 md:py-14 pb-24 md:pb-14">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
              Histórico
            </h1>
            <p className="text-sm text-mute">
              Sua evolução ao longo das semanas e dos meses.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setView("weeks")}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
              view === "weeks"
                ? "border-ember/60 bg-emberSoft text-bone"
                : "border-line text-mute hover:text-bone"
            }`}
          >
            Semanas
          </button>
          <button
            onClick={() => setView("months")}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
              view === "months"
                ? "border-ember/60 bg-emberSoft text-bone"
                : "border-line text-mute hover:text-bone"
            }`}
          >
            Meses
          </button>
        </div>

        {fetching ? (
          <p className="text-sm text-mute">Carregando...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((s) => (
              <div
                key={s.key}
                className={`rounded-lg border p-5 ${
                  s.isCurrent
                    ? "border-ember/40 bg-panel"
                    : "border-line bg-panel"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-bone capitalize">{s.label}</p>
                  {s.isCurrent && (
                    <span className="text-[10px] text-ember border border-ember/40 rounded-full px-2 py-0.5">
                      Atual
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-5">
                  <ProgressRing
                    percent={s.percent}
                    size={76}
                    label={`${s.percent}%`}
                  />
                  <div className="flex flex-col gap-1.5 text-sm">
                    <div>
                      <span className="text-bone font-medium">
                        {s.tasksDone}/{s.tasksTotal}
                      </span>
                      <span className="text-mute text-xs block">TAREFAS</span>
                    </div>
                    <div>
                      <span className="text-bone font-medium">
                        {s.habitsDone}/{s.habitsPossible}
                      </span>
                      <span className="text-mute text-xs block">HÁBITOS</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}