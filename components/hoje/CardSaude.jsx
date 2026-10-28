"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";
import { METAS_PADRAO } from "@/lib/saudeUtils";

const litros = (ml) =>
  (Number(ml || 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " L";
const num = (n, d = 1) =>
  Number(n).toLocaleString("pt-BR", { maximumFractionDigits: d });

export default function CardSaude({ userId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function carregar() {
      const hoje = todayISO();

      const [d, s, m] = await Promise.all([
        supabase
          .from("health_daily")
          .select("water_ml, sleep_hours")
          .eq("user_id", userId)
          .eq("day", hoje)
          .maybeSingle(),
        supabase
          .from("health_settings")
          .select("water_goal_ml")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("body_measurements")
          .select("day, weight_kg")
          .eq("user_id", userId)
          .not("weight_kg", "is", null)
          .order("day", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelado) return;
      if (d.error || s.error || m.error) {
        setDados({ erro: true });
        return;
      }

      const agua = d.data ? Number(d.data.water_ml) || 0 : 0;
      const meta =
        s.data && s.data.water_goal_ml
          ? Number(s.data.water_goal_ml)
          : METAS_PADRAO.agua;

      setDados({
        agua,
        meta,
        pct: meta > 0 ? Math.min(100, Math.round((agua / meta) * 100)) : 0,
        sono:
          d.data && d.data.sleep_hours != null ? Number(d.data.sleep_hours) : null,
        peso: m.data ? Number(m.data.weight_kg) : null,
      });
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  return (
    <Link
      href="/saude"
      className="block min-w-0 rounded-lg border border-line bg-panel p-5 hover:border-ember"
    >
      <p className="mb-3 text-xs uppercase tracking-wide text-mute">Saúde</p>
      {!dados ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : dados.erro ? (
        <p className="text-sm text-mute">Não consegui carregar.</p>
      ) : (
        <>
          <p className="font-serif text-2xl text-bone">
            {litros(dados.agua)}{" "}
            <span className="text-sm text-mute">de {litros(dados.meta)}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-ember transition-all"
              style={{ width: `${dados.pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-mute">
            {dados.sono != null ? `Sono hoje: ${num(dados.sono)} h` : "Sono de hoje: não registrado"}
            {dados.peso != null ? ` · Último peso: ${num(dados.peso)} kg` : ""}
          </p>
        </>
      )}
    </Link>
  );
}