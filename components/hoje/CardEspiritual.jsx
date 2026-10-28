"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { todayISO, habitAppliesOnISO } from "@/lib/dateUtils";
import { HABITOS_ESPIRITUAIS } from "@/lib/sugestoes";

export default function CardEspiritual({ userId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function carregar() {
      const hoje = todayISO();

      const [pl, hb, lg] = await Promise.all([
        supabase
          .from("reading_plans")
          .select("id, total_days")
          .eq("user_id", userId)
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("habits").select("*").eq("user_id", userId),
        supabase
          .from("habit_logs")
          .select("habit_id")
          .eq("user_id", userId)
          .eq("date", hoje),
      ]);

      if (cancelado) return;
      if (pl.error || hb.error || lg.error) {
        setDados({ erro: true });
        return;
      }

      // Leitura
      let leitura = "sem-plano";
      const plano = (pl.data || [])[0];
      if (plano) {
        const pr = await supabase
          .from("reading_progress")
          .select("day_number, done_at")
          .eq("plan_id", plano.id)
          .eq("user_id", userId);
        if (cancelado) return;
        if (pr.error) {
          setDados({ erro: true });
          return;
        }
        const lista = pr.data || [];
        if (lista.some((r) => r.done_at === hoje)) leitura = "feita";
        else if (lista.length >= plano.total_days) leitura = "concluido";
        else leitura = "pendente";
      }

      // Hábitos espirituais que valem hoje
      const nomes = new Set(
        HABITOS_ESPIRITUAIS.map((h) => h.nome.trim().toLowerCase())
      );
      const feitosIds = new Set((lg.data || []).map((l) => l.habit_id));
      const habitos = (hb.data || [])
        .filter((h) => nomes.has(String(h.name).trim().toLowerCase()))
        .filter((h) => habitAppliesOnISO(h, hoje))
        .map((h) => ({ id: h.id, nome: h.name, feito: feitosIds.has(h.id) }));

      setDados({ leitura, habitos });
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  const textoLeitura = {
    feita: "Feita",
    pendente: "Pendente",
    concluido: "Plano concluído",
    "sem-plano": "Sem plano ativo",
  };

  return (
    <Link
      href="/espiritual"
      className="block min-w-0 rounded-lg border border-line bg-panel p-5 hover:border-ember"
    >
      <p className="mb-3 text-xs uppercase tracking-wide text-mute">Espiritual</p>
      {!dados ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : dados.erro ? (
        <p className="text-sm text-mute">Não consegui carregar.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <li className="flex items-center justify-between gap-3 text-sm">
            <span className="text-bone">Leitura</span>
            <span
              className={
                dados.leitura === "pendente" ? "text-ember" : "text-mute"
              }
            >
              {textoLeitura[dados.leitura]}
            </span>
          </li>
          {dados.habitos.length === 0 ? (
            <li className="flex items-center justify-between gap-3 text-sm">
              <span className="text-bone">Oração</span>
              <span className="text-mute">Sem hábito para hoje</span>
            </li>
          ) : (
            dados.habitos.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-bone">{h.nome}</span>
                <span className={h.feito ? "text-mute" : "text-ember"}>
                  {h.feito ? "Feito" : "Pendente"}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </Link>
  );
}