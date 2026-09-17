"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import WeekCalendar from "@/components/WeekCalendar";
import TaskList from "@/components/TaskList";
import TaskForm from "@/components/TaskForm";
import { getWeekDates, toISODate, todayISO } from "@/lib/dateUtils";
import { getRandomQuote } from "@/lib/quotes";

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [logsByHabit, setLogsByHabit] = useState({});
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const today = todayISO();
  const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor]);
  const weekStart = toISODate(weekDates[0]);
  const weekEnd = toISODate(weekDates[6]);
  const quote = useMemo(() => getRandomQuote(), []);

  const loadWeekTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .gte("due_date", weekStart)
      .lte("due_date", weekEnd)
      .order("created_at", { ascending: true });
    if (!error) setTasks(data ?? []);
  }, [user, weekStart, weekEnd]);

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
      .eq("user_id", user.id)
      .eq("date", today);

    const grouped = {};
    (logsData ?? []).forEach((log) => {
      if (!grouped[log.habit_id]) grouped[log.habit_id] = [];
      grouped[log.habit_id].push(log);
    });
    setLogsByHabit(grouped);
  }, [user, today]);

  useEffect(() => {
    loadWeekTasks();
  }, [loadWeekTasks]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    });
    return map;
  }, [tasks]);

  async function handleCreate(newTask) {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...newTask, user_id: user.id })
      .select()
      .single();
    if (!error) setTasks((prev) => [...prev, data]);
  }

  async function handleToggle(task) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: !task.is_completed })
      .eq("id", task.id);
    if (!error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
        )
      );
    }
  }

  async function handleDelete(task) {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  async function handleToggleHabitToday(habit) {
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

  function goToPreviousWeek() {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() - 7);
    setWeekAnchor(d);
  }

  function goToNextWeek() {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + 7);
    setWeekAnchor(d);
  }

  if (loading || !user) return null;

  const selectedTasks = tasksByDate[selectedDate] ?? [];
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "2-digit", month: "long" }
  );
  const isSelectedToday = selectedDate === today;

  // Próximas tarefas da semana (não concluídas), ordenadas por data
  const weekTasksSorted = [...tasks]
    .filter((t) => !t.is_completed)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 6);

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 px-6 py-10 md:px-12 md:py-14 pb-24 md:pb-14">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-ember uppercase tracking-wide mb-1">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
              Agenda
            </h1>
            <p className="text-sm text-mute">
              Planeje hoje o que te aproxima dos seus objetivos.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm">
            <button
              onClick={goToPreviousWeek}
              className="text-mute hover:text-bone transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={goToNextWeek}
              className="text-mute hover:text-bone transition-colors"
            >
              Próxima →
            </button>
          </div>
        </div>

        <div className="mb-8">
          <WeekCalendar
            weekDates={weekDates}
            tasksByDate={tasksByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Painel principal: dia selecionado */}
          <div className="md:col-span-2 rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg text-bone capitalize">{selectedLabel}</p>
              {isSelectedToday && (
                <span className="text-xs text-ember border border-ember/40 rounded-full px-2 py-0.5">
                  Hoje
                </span>
              )}
            </div>

            {selectedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14 border-b border-line mb-4">
                <p className="text-sm text-mute mb-1">
                  Nenhuma tarefa agendada para este dia.
                </p>
                <p className="text-xs text-mute/70">Aproveite o seu tempo.</p>
              </div>
            ) : (
              <div className="mb-4">
                <TaskList
                  tasks={selectedTasks}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              </div>
            )}

            <TaskForm defaultDate={selectedDate} onCreate={handleCreate} />
          </div>

          {/* Painéis laterais */}
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs tracking-wide text-mute uppercase">
                  Tarefas da Semana
                </h2>
              </div>
              {weekTasksSorted.length === 0 ? (
                <p className="text-sm text-mute">Nenhuma tarefa pendente.</p>
              ) : (
                <ul className="flex flex-col">
                  {weekTasksSorted.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 py-2 border-b border-line last:border-0"
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={t.is_completed}
                        onChange={() => handleToggle(t)}
                      />
                      <span className="text-sm text-bone flex-1 truncate">
                        {t.title}
                      </span>
                      <span className="text-xs text-mute">
                        {t.due_date.slice(8, 10)}/{t.due_date.slice(5, 7)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-3">
                Hábitos
              </h2>
              {habits.length === 0 ? (
                <p className="text-sm text-mute">Nenhum hábito cadastrado.</p>
              ) : (
                <ul className="flex flex-col">
                  {habits.map((habit) => {
                    const doneToday = (logsByHabit[habit.id] ?? []).some(
                      (l) => l.date === today
                    );
                    return (
                      <li
                        key={habit.id}
                        className="flex items-center gap-3 py-2 border-b border-line last:border-0"
                      >
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={doneToday}
                          onChange={() => handleToggleHabitToday(habit)}
                        />
                        <span className="text-sm text-bone flex-1">
                          {habit.name}
                        </span>
                        <span className="text-xs text-mute">
                          {doneToday ? 1 : 0}/1
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
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