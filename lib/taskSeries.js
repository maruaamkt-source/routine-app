import { supabase } from "@/lib/supabaseClient";
import { todayISO, toISODate } from "@/lib/dateUtils";

const DAYS_AHEAD = 60; // até quantos dias à frente manter criado
const RENEW_WHEN_LEFT_DAYS = 14; // renova quando sobrar menos que isso

// Se a tarefa faz parte de uma série, pergunta se quer apagar as próximas também.
// Retorna true se apagou as próximas repetições.
export async function deleteFutureOccurrences(task) {
  if (!task.series_id) return false;
  const all = window.confirm(
    "Esta tarefa se repete.\n\nOK = excluir esta e as próximas\nCancelar = excluir só esta"
  );
  if (!all) return false;
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("series_id", task.series_id)
    .gt("due_date", task.due_date);
  if (error) return false;

  // Marca a série como encerrada pra não ser renovada sozinha
  await supabase
    .from("tasks")
    .update({ series_ended: true })
    .eq("series_id", task.series_id);

  return true;
}

function addDaysISO(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

let renewing = false;

// Completa as séries que estão acabando. Retorna true se criou tarefas novas.
export async function renewSeries(userId) {
  if (renewing) return false;
  renewing = true;
  try {
    const today = todayISO();
    const limitISO = addDaysISO(today, DAYS_AHEAD);
    const renewBefore = addDaysISO(today, RENEW_WHEN_LEFT_DAYS);

    const { data, error } = await supabase
      .from("tasks")
      .select(
        "series_id, title, kind, due_date, due_time, start_time, end_time, series_ended"
      )
      .eq("user_id", userId)
      .not("series_id", "is", null);
    if (error || !data || data.length === 0) return false;

    const bySeries = {};
    data.forEach((t) => {
      if (!bySeries[t.series_id]) bySeries[t.series_id] = [];
      bySeries[t.series_id].push(t);
    });

    const rows = [];
    Object.entries(bySeries).forEach(([seriesId, list]) => {
      if (list.some((t) => t.series_ended)) return;

      list.sort((a, b) => a.due_date.localeCompare(b.due_date));
      const last = list[list.length - 1];
      if (last.due_date >= renewBefore) return;

      // Padrão: quais dias da semana a série usa (0 = segunda)
      const weekdays = new Set(
        list.map((t) => (new Date(`${t.due_date}T00:00:00`).getDay() + 6) % 7)
      );

      // Começa depois da última repetição (ou de ontem, se a série já acabou)
      const yesterday = addDaysISO(today, -1);
      let cursor = last.due_date > yesterday ? last.due_date : yesterday;

      while (true) {
        cursor = addDaysISO(cursor, 1);
        if (cursor > limitISO) break;
        const idx = (new Date(`${cursor}T00:00:00`).getDay() + 6) % 7;
        if (!weekdays.has(idx)) continue;
        rows.push({
          user_id: userId,
          series_id: seriesId,
          title: last.title,
          kind: last.kind,
          due_date: cursor,
          due_time: last.due_time,
          start_time: last.start_time,
          end_time: last.end_time,
        });
      }
    });

    if (rows.length === 0) return false;
    const { error: insertError } = await supabase.from("tasks").insert(rows);
    return !insertError;
  } finally {
    renewing = false;
  }
}