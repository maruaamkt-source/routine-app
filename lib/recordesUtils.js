import { supabase } from "@/lib/supabaseClient";

// Devolve lista de exercícios que bateram recorde de carga neste treino.
// Chamar ANTES de inserir os exercícios do treino novo.
export async function checarRecordes(userId, lista) {
  const comCarga = (lista || []).filter((e) => Number(e.weight_kg) > 0);
  if (comCarga.length === 0) return [];

  const nomes = [...new Set(comCarga.map((e) => e.name))];
  const { data, error } = await supabase
    .from("workout_exercises")
    .select("name, weight_kg")
    .eq("user_id", userId)
    .in("name", nomes)
    .limit(5000);
  if (error) return [];

  const maximo = {};
  (data || []).forEach((r) => {
    const w = Number(r.weight_kg) || 0;
    if (!(r.name in maximo) || w > maximo[r.name]) maximo[r.name] = w;
  });

  const prs = [];
  comCarga.forEach((e) => {
    const w = Number(e.weight_kg);
    // só conta se já existe histórico do exercício
    if (e.name in maximo && w > maximo[e.name]) {
      const ja = prs.find((p) => p.name === e.name);
      if (ja) ja.weight_kg = Math.max(ja.weight_kg, w);
      else prs.push({ name: e.name, weight_kg: w });
    }
  });
  return prs;
}