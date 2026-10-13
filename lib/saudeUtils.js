import { toISODate } from "@/lib/dateUtils";

// Para mudar as medidas do corpo, mexa só nesta lista
// (se criar uma nova, precisa criar a coluna no Supabase com o mesmo nome da key).
export const MEDIDAS = [
  { key: "weight_kg", label: "Peso", unidade: "kg" },
  { key: "waist_cm", label: "Cintura", unidade: "cm" },
  { key: "chest_cm", label: "Peito", unidade: "cm" },
  { key: "hip_cm", label: "Quadril", unidade: "cm" },
  { key: "arm_cm", label: "Braço", unidade: "cm" },
  { key: "thigh_cm", label: "Coxa", unidade: "cm" },
];

export const METAS_PADRAO = { agua: 2000, sono: 8 };

// Botões rápidos de água (ml)
export const BOTOES_AGUA = [200, 300, 500];

// Lista de datas (ISO) de hoje para trás: ultimosDias(7) = hoje e os 6 dias anteriores
export function ultimosDias(n, hoje = new Date()) {
  const lista = [];
  for (let i = 0; i < n; i++) {
    lista.push(
      toISODate(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i))
    );
  }
  return lista;
}

// 1500 vira "1,5 L" e 250 vira "250 ml"
export function formatarMl(ml) {
  const v = Number(ml) || 0;
  if (v >= 1000) {
    return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;
  }
  return `${v} ml`;
}

// 7.5 vira "7h30" e 8 vira "8h"
export function formatarHoras(h) {
  const total = Math.round((Number(h) || 0) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return mm === 0 ? `${hh}h` : `${hh}h${String(mm).padStart(2, "0")}`;
}

// "2026-10-13" vira "13/10/26"
export function dataCurta(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}