"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import HabitCard from "@/components/HabitCard";
import HabitForm from "@/components/HabitForm";
import ProgressRing from "@/components/ProgressRing";
import {
  todayISO,
  calculateStreak,
  getWeekDates,
  toISODate,
  habitAppliesOnISO,
} from "@/lib/dateUtils";
import { getRandomQuote } from "@/lib/quotes";

export default function HabitsPage() {
  const { user, loading } = useAuth();
  const [habits, setHabits] = useState([]);
  const [logsByHabit, setLogsByHabit] = useState({});
  const today = todayISO();
  const quote = useMemo(() => getRandomQuote(), []);

  const weekDates = useMemo(() => getWeekDates(new Date()), []);
  const weekDatesISO = useMemo(
    () => weekDates.map((d) => toISODate(d)).filter((iso) => iso <= today),
    [weekDates, today]
  );

  const loadHabits = useCallback(async () => {
    if (!user) return;

    const { data: habitsData, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (habitsError || !habitsData) return;
    setHabits(habitsData);

    const { data: logsData } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id);

    const grouped = {};
    (logsData ?? []).forEach((log) => {
      if (!grouped[log.habit_id]) grouped[log.habit_id] = [];
      grouped[log.habit_id].push(log);
    });
    setLogsByHabit(grouped);
  }, [user]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  async function handleCreateHabit(name, days_of_week) {
    if (!user) return;
    const { data, error } = await supabase
      .from("habits")
      .insert({ name, user_id: user.id, days_of_week })
      .select()
      .single();
    if (!error) setHabits((prev) => [...prev, data]);
  }

  async function handleDeleteHabit(habit) {
    const { error } = await supabase.from("habits").delete().eq("id", habit.id);
    if (!error) setHabits((prev) => prev.filter((h) => h.id !== habit.id));
  }

  async function handleToggleToday(habit) {
    const logs = logsByHabit[habit.id] ?? [];
    const todayLog = logs.find((l) => l.date === today);

    if (todayLog) {
      const { error } = await supabase
        .from("habit_logs")
        .delete()
        .eq("id", todayLog.id);
      if (!error) {
        setLogsByHabit((prev) => ({
          ...prev,
          [habit.id]: (prev[habit.id] ?? []).filter((l) => l.id !== todayLog.id),
        }));
      }
    } else {
      const { data, error } = await supabase
        .from("habit_logs")
        .insert({
          habit_id: habit.id,
          user_id: user.id,
          date: today,
          completed: true,
        })
        .select()
        .single();
      if (!error) {
        setLogsByHabit((prev) => ({
          ...prev,
          [habit.id]: [...(prev[habit.id] ?? []), data],
        }));
      }
    }
  }

  if (loading || !user) return null;

  // Hábitos previstos hoje: usado só para contagem e para filtro do progresso.
  // A LISTA EXIBIDA usa `habits` (todos), não esse filtro — um hábito que não
  // é previsto para hoje continua aparecendo na tela, só não conta pro "feito hoje".
  const habitsAppliedToday = habits.filter((h) => habitAppliesOnISO(h, today));

  const allLogs = Object.values(logsByHabit).flat();
  const habitsDoneToday = habitsAppliedToday.filter((h) =>
    (logsByHabit[h.id] ?? []).some((l) => l.date === today)
  ).length;

  // Progresso semanal: para cada dia já passado da semana, soma quantos hábitos se aplicavam
  let habitsPossibleWeek = 0;
  weekDatesISO.forEach((iso) => {
    habits.forEach((h) => {
      if (habitAppliesOnISO(h, iso)) habitsPossibleWeek += 1;
    });
  });

  const weekStart = weekDatesISO[0];
  const weekEnd = weekDatesISO[weekDatesISO.length - 1];
  const habitsDoneWeek = allLogs.filter(
    (l) => l.completed && l.date >= weekStart && l.date <= weekEnd
  ).length;

  const weekPercent = habitsPossibleWeek
    ? Math.round((habitsDoneWeek / habitsPossibleWeek) * 100)
    : 0;

  const uniqueDoneDates = new Set(
    allLogs.filter((l) => l.completed).map((l) => l.date)
  );
  const streakLogs = [...uniqueDoneDates].map((date) => ({ date, completed: true }));
  const overallStreak = calculateStreak(streakLogs);

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 px-6 py-10 md:px-12 md:py-14 pb-24 md:pb-14">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-sm text-ember uppercase tracking-wide mb-1">
              {dateLabel}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
              Hábitos
            </h1>
            <p className="text-sm text-mute">
              Marque o que você cumpriu hoje e acompanhe sua sequência.
            </p>
          </div>
          <p className="hidden md:block text-right text-sm italic text-mute max-w-xs leading-relaxed">
            "{quote.text}"
            <span className="block not-italic text-xs text-ember mt-1">
              — {quote.ref}
            </span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg text-bone capitalize">{dateLabel}</p>
              <span className="text-xs text-mute border border-line rounded-full px-2 py-0.5">
                {habitsDoneToday}/{habitsAppliedToday.length || 0}
              </span>
            </div>

            {habits.length === 0 ? (
              <p className="text-sm text-mute py-4">
                Nenhum hábito cadastrado ainda.
              </p>
            ) : (
              <div>
                {habits.map((habit) => {
                  const logs = logsByHabit[habit.id] ?? [];
                  const doneToday = logs.some((l) => l.date === today);
                  const streak = calculateStreak(logs);
                  const appliesToday = habitAppliesOnISO(habit, today);
                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      logs={logs}
                      doneToday={doneToday}
                      streak={streak}
                      appliesToday={appliesToday}
                      onToggleToday={handleToggleToday}
                      onDelete={handleDeleteHabit}
                    />
                  );
                })}
              </div>
            )}

            <div className="mt-4">
              <HabitForm onCreate={handleCreateHabit} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
                Progresso Semanal
              </h2>
              <div className="flex items-center gap-5">
                <ProgressRing
                  percent={weekPercent}
                  size={88}
                  label={`${weekPercent}%`}
                  sublabel="DA SEMANA"
                />
                <div className="flex flex-col gap-2 text-sm">
                  <div>
                    <span className="text-bone font-medium">{habitsDoneToday}</span>
                    <span className="text-mute text-xs block">HÁBITOS CONCLUÍDOS</span>
                  </div>
                  <div>
                    <span className="text-bone font-medium">{habitsDoneWeek}</span>
                    <span className="text-mute text-xs block">TAREFAS FEITAS</span>
                  </div>
                  <div>
                    <span className="text-bone font-medium">{overallStreak}</span>
                    <span className="text-mute text-xs block">DIAS SEGUIDOS</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
              <p className="text-sm italic text-bone/90 leading-snug">
                {quote.text}
              </p>
              <p className="text-xs text-ember mt-1">— {quote.ref}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}