"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import Nav from "@/components/Nav";
import TaskList from "@/components/TaskList";
import TaskForm from "@/components/TaskForm";
import ProgressRing from "@/components/ProgressRing";
import NotificationButton from "@/components/NotificationButton";
import {
  todayISO,
  toISODate,
  getWeekDates,
  WEEKDAY_LABELS,
  calculateStreak,
  habitAppliesOnISO,
} from "@/lib/dateUtils";
import { scheduleTaskReminders } from "@/lib/notifications";
import { renewSeries } from "@/lib/taskSeries";
import { getQuoteForDate, getRandomQuote } from "@/lib/quotes";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pad = (n) => String(n).padStart(2, "0");

// "2026-10-01" a partir de uma data (primeiro dia do mês dela)
function primeiroDiaDoMesISO(data) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-01`;
}

// Próximo vencimento de um gasto fixo.
// Retorna { dias, refMonth }:
//  - dias: quantos dias faltam (0 = hoje)
//  - refMonth: mês (dia 01) a que esse vencimento pertence, igual ao
//    ref_month da tabela fixed_payments
// Se o dia não existe no mês (ex.: dia 31 em abril), vale o último dia do mês.
function proximoVencimento(diaVenc, agora) {
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const y = agora.getFullYear();
  const m = agora.getMonth();

  const ultimoDoMes = new Date(y, m + 1, 0).getDate();
  let alvo = new Date(y, m, Math.min(diaVenc, ultimoDoMes));

  if (alvo < inicioHoje) {
    const ultimoProximo = new Date(y, m + 2, 0).getDate();
    alvo = new Date(y, m + 1, Math.min(diaVenc, ultimoProximo));
  }

  return {
    dias: Math.round((alvo - inicioHoje) / 86400000),
    refMonth: primeiroDiaDoMesISO(alvo),
  };
}

export default function TodayPage() {
  const { user, loading } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [weekTasks, setWeekTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [logsByHabit, setLogsByHabit] = useState({});
  const [fixos, setFixos] = useState([]);
  const [pagos, setPagos] = useState([]); // chaves "idDoFixo|AAAA-MM-01"
  const [pagando, setPagando] = useState(null); // chave do item sendo gravado
  const [erroVenc, setErroVenc] = useState("");
  const [fetching, setFetching] = useState(true);

  const today = todayISO();
  const weekDates = useMemo(() => getWeekDates(new Date()), []);
  const weekStart = toISODate(weekDates[0]);
  const weekEnd = toISODate(weekDates[6]);
  const weekDatesISO = useMemo(
    () => weekDates.map((d) => toISODate(d)).filter((iso) => iso <= today),
    [weekDates, today]
  );

  const headerQuote = useMemo(() => getQuoteForDate(new Date()), []);
  const panelQuote = useMemo(() => getRandomQuote(), []);

  // Gastos fixos que vencem hoje ou nos próximos 3 dias e ainda não foram pagos
  const vencimentos = useMemo(() => {
    const agora = new Date();
    return fixos
      .filter((f) => f.due_day)
      .map((f) => {
        const { dias, refMonth } = proximoVencimento(f.due_day, agora);
        return {
          id: f.id,
          nome: f.name,
          valor: Number(f.amount),
          dias,
          refMonth,
          chave: `${f.id}|${refMonth}`,
        };
      })
      .filter((f) => f.dias <= 3 && !pagos.includes(f.chave))
      .sort((a, b) => a.dias - b.dias);
  }, [fixos, pagos, today]);

  const loadData = useCallback(async () => {
    if (!user) return;

    // Meses que podem ter vencimento no aviso (atual e próximo)
    const agora = new Date();
    const mesAtual = primeiroDiaDoMesISO(agora);
    const mesSeguinte = primeiroDiaDoMesISO(
      new Date(agora.getFullYear(), agora.getMonth() + 1, 1)
    );

    const [todayRes, weekRes, habitsRes, logsRes, fixedRes, payRes] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("due_date", today)
          .order("created_at", { ascending: true }),
        supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .gte("due_date", weekStart)
          .lte("due_date", weekEnd),
        supabase
          .from("habits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase.from("habit_logs").select("*").eq("user_id", user.id),
        supabase
          .from("fixed_expenses")
          .select("id, name, amount, due_day")
          .eq("user_id", user.id)
          .not("due_day", "is", null),
        supabase
          .from("fixed_payments")
          .select("fixed_expense_id, ref_month")
          .eq("user_id", user.id)
          .in("ref_month", [mesAtual, mesSeguinte]),
      ]);

    if (!todayRes.error) setTasks(todayRes.data ?? []);
    if (!weekRes.error) setWeekTasks(weekRes.data ?? []);
    if (!habitsRes.error) setHabits(habitsRes.data ?? []);
    if (!fixedRes.error) setFixos(fixedRes.data ?? []);
    if (!payRes.error) {
      setPagos(
        (payRes.data ?? []).map((p) => `${p.fixed_expense_id}|${p.ref_month}`)
      );
    }

    const grouped = {};
    (logsRes.data ?? []).forEach((log) => {
      if (!grouped[log.habit_id]) grouped[log.habit_id] = [];
      grouped[log.habit_id].push(log);
    });
    setLogsByHabit(grouped);

    setFetching(false);
  }, [user, today, weekStart, weekEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    renewSeries(user.id).then((created) => {
      if (created) loadData();
    });
  }, [user, loadData]);

  useEffect(() => {
    const cleanup = scheduleTaskReminders(tasks, today);
    return cleanup;
  }, [tasks, today]);

  async function handleCreate(newTask) {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...newTask, user_id: user.id })
      .select()
      .single();
    if (!error) {
      setTasks((prev) => [...prev, data]);
      setWeekTasks((prev) => [...prev, data]);
    }
  }

  async function handleToggle(task) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: !task.is_completed })
      .eq("id", task.id);
    if (!error) {
      const updater = (prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
        );
      setTasks(updater);
      setWeekTasks(updater);
    }
  }

  async function handleDelete(task) {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setWeekTasks((prev) => prev.filter((t) => t.id !== task.id));
    }
  }

  function handleUpdate(updated) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)).filter((t) => t.due_date === today)
    );
    setWeekTasks((prev) =>
      prev
        .map((t) => (t.id === updated.id ? updated : t))
        .filter((t) => t.due_date >= weekStart && t.due_date <= weekEnd)
    );
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

  // Marca o vencimento como pago (grava em fixed_payments) e tira do aviso
  async function handlePagar(v) {
    if (!user || pagando) return;
    setPagando(v.chave);

    const { error } = await supabase.from("fixed_payments").insert({
      user_id: user.id,
      fixed_expense_id: v.id,
      ref_month: v.refMonth,
    });

    setPagando(null);

    // 23505 = já estava marcado como pago (unique), então tudo certo
    if (error && error.code !== "23505") {
      setErroVenc("Não foi possível marcar como pago. Tente de novo.");
      return;
    }

    setErroVenc("");
    setPagos((prev) => (prev.includes(v.chave) ? prev : [...prev, v.chave]));
  }

  if (loading || !user) return null;

  const doneCount = tasks.filter((t) => t.is_completed).length;
  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const habitsToday = habits.filter((h) => habitAppliesOnISO(h, today));

  // Estatísticas da semana
  const allLogs = Object.values(logsByHabit).flat();

  const tasksDoneWeek = weekTasks.filter((t) => t.is_completed).length;
  const tasksTotalWeek = weekTasks.length;

  const habitsDoneWeek = allLogs.filter(
    (l) => l.completed && l.date >= weekStart && l.date <= weekEnd
  ).length;

  let habitsPossibleWeek = 0;
  weekDatesISO.forEach((iso) => {
    habits.forEach((h) => {
      if (habitAppliesOnISO(h, iso)) habitsPossibleWeek += 1;
    });
  });

  const totalDone = tasksDoneWeek + habitsDoneWeek;
  const totalPossible = tasksTotalWeek + habitsPossibleWeek;
  const weekPercent = totalPossible
    ? Math.round((totalDone / totalPossible) * 100)
    : 0;

  const uniqueDoneDates = new Set(
    allLogs.filter((l) => l.completed).map((l) => l.date)
  );
  const streakLogs = [...uniqueDoneDates].map((date) => ({
    date,
    completed: true,
  }));
  const streak = calculateStreak(streakLogs);

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-6 py-10 md:px-12 md:py-14 pb-14">
        <div className="flex items-start justify-between mb-8">
          <div className="min-w-0">
            <p className="text-sm text-ember uppercase tracking-wide mb-1">
              {dateLabel}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
              {greeting()}, {user.user_metadata?.name || user.email?.split("@")[0]}.
            </h1>
            <p className="text-sm text-mute mb-3">
              {fetching
                ? "Carregando..."
                : tasks.length === 0
                ? "Você não tem tarefas pendentes para hoje."
                : doneCount === tasks.length
                ? "Tudo em ordem."
                : `${tasks.length - doneCount} pendente${
                    tasks.length - doneCount === 1 ? "" : "s"
                  }`}
            </p>
            <NotificationButton userId={user.id} />
          </div>
          <p className="hidden md:block text-right text-sm italic text-mute max-w-xs leading-relaxed">
            "{headerQuote.text}"
            <span className="block not-italic text-xs text-ember mt-1">
              — {headerQuote.ref}
            </span>
          </p>
        </div>

        <div className="mb-6">
          <TaskForm defaultDate={today} onCreate={handleCreate} />
        </div>

        {(vencimentos.length > 0 || erroVenc) && (
          <div className="mb-6 rounded-lg border-l-2 border-ember bg-panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs tracking-wide text-mute uppercase">
                Vencimentos próximos
              </h2>
              <Link href="/financeiro" className="text-xs text-ember">
                Ver financeiro →
              </Link>
            </div>

            {erroVenc && (
              <p className="mb-2 text-sm text-bone/90">{erroVenc}</p>
            )}

            <ul className="flex flex-col gap-2">
              {vencimentos.map((v) => (
                <li
                  key={v.chave}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate text-bone">
                    {v.nome}{" "}
                    <span className="text-mute">
                      {v.dias === 0
                        ? "vence hoje"
                        : v.dias === 1
                        ? "vence amanhã"
                        : `vence em ${v.dias} dias`}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-bone tabular-nums">
                      {brl(v.valor)}
                    </span>
                    <button
                      onClick={() => handlePagar(v)}
                      disabled={pagando === v.chave}
                      className="rounded-lg bg-ember px-3 py-1 text-xs font-medium text-ink disabled:opacity-60"
                    >
                      {pagando === v.chave ? "..." : "Paguei"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Painel: hoje */}
          <div className="min-w-0 rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs tracking-wide text-mute uppercase">
                {new Date().toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-4">
              {weekDates.map((d, i) => {
                const iso = toISODate(d);
                const isToday = iso === today;
                return (
                  <div key={iso} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-mute">
                      {WEEKDAY_LABELS[i]}
                    </span>
                    <span
                      className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-ember text-ink font-medium" : "text-bone"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-line pt-4">
              <p className="text-xs text-ember uppercase tracking-wide mb-3">
                {dateLabel}
              </p>
              {tasks.length === 0 ? (
                <p className="text-sm text-mute italic">
                  Amanhã é uma nova oportunidade.
                </p>
              ) : (
                <TaskList
                  tasks={tasks}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              )}
            </div>
          </div>

          {/* Painel: hábitos */}
          <div className="min-w-0 rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs tracking-wide text-mute uppercase">
                Hábitos
              </h2>
              <Link href="/habits" className="text-xs text-ember">
                Ver todos →
              </Link>
            </div>
            {habitsToday.length === 0 ? (
              <p className="text-sm text-mute">
                {habits.length === 0
                  ? "Nenhum hábito cadastrado."
                  : "Nenhum hábito previsto para hoje."}
              </p>
            ) : (
              <ul className="flex flex-col">
                {habitsToday.map((habit) => {
                  const doneToday = (logsByHabit[habit.id] ?? []).some(
                    (l) => l.date === today
                  );
                  return (
                    <li
                      key={habit.id}
                      className="flex items-center gap-3 py-2.5 border-b border-line last:border-0"
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={doneToday}
                        onChange={() => handleToggleHabitToday(habit)}
                      />
                      <span className="text-sm text-bone flex-1 min-w-0">
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

          {/* Painel: progresso semanal */}
          <div className="min-w-0 rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs tracking-wide text-mute uppercase">
                Progresso Semanal
              </h2>
              <Link href="/habits" className="text-xs text-ember">
                Ver detalhes →
              </Link>
            </div>
            <div className="flex items-center gap-5 mb-5">
              <ProgressRing
                percent={weekPercent}
                size={88}
                label={`${weekPercent}%`}
                sublabel="DA SEMANA"
              />
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <span className="text-bone font-medium">{habitsDoneWeek}</span>
                  <span className="text-mute text-xs block">
                    HÁBITOS CONCLUÍDOS
                  </span>
                </div>
                <div>
                  <span className="text-bone font-medium">{tasksDoneWeek}</span>
                  <span className="text-mute text-xs block">TAREFAS FEITAS</span>
                </div>
                <div>
                  <span className="text-bone font-medium">{streak}</span>
                  <span className="text-mute text-xs block">DIAS SEGUIDOS</span>
                </div>
              </div>
            </div>
            <div className="border-l-2 border-ember pl-3">
              <p className="text-sm italic text-bone/90 leading-snug">
                {panelQuote.text}
              </p>
              <p className="text-xs text-ember mt-1">— {panelQuote.ref}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}