import { supabase } from "@/lib/supabaseClient";

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
  return !error;
}