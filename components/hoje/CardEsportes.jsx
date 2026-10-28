"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getWeekDates, toISODate, todayISO } from "@/lib/dateUtils";

export default function CardEsportes({ userId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function carregar() {
      const dias = getWeekDates(new Date()).map((d) => toISODate(d));
      const hoje = todayISO();
      const idxHoje = (new Date().getDay() + 6) % 7; // 0=Seg..6=Dom

      const [t, p, s] = await Promise.all([
        supabase
          .from("workouts")
          .select("day")
          .eq("user_id", userId)
          .gte("day", dias[0])
          .lte("day", dias[6]),
        supabase.from("workout_plans").select("weekdays").eq("user_id", userId),
        supabase
          .from("health_settings")
          .select("workouts_per_week, meta_manual")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (cancelado) return;
      if (t.error || p.error || s.error) {
        setDados({ erro: true });
        return;
      }

      const treinos = t.data || [];
      const planos = p.data || [];
      const feitosSemana = new Set(treinos.map((x) => x.day)).size;
      const feitoHoje = treinos.some((x) => x.day === hoje);
      const planejadoHoje = planos.some((pl) =>
        (pl.weekdays || []).includes(idxHoje)
      );
      const diasPlanejados = new Set(planos.flatMap((pl) => pl.weekdays || []))
        .size;
      const metaSalva = (s.data && s.data.workouts_per_week) || 3;
      const manual = !!(s.data && s.data.meta_manual);
      const meta = manual || diasPlanejados === 0 ? metaSalva : diasPlanejados;

      setDados({
        status: feitoHoje ? "Feito" : planejadoHoje ? "Pendente" : "Descanso",
        feitosSemana,
        meta,
      });
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  return (
    <Link
      href="/esportes"
      className="block min-w-0 rounded-lg border border-line bg-panel p-5 hover:border-ember"
    >
      <p className="mb-3 text-xs uppercase tracking-wide text-mute">Esportes</p>
      {!dados ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : dados.erro ? (
        <p className="text-sm text-mute">Não consegui carregar.</p>
      ) : (
        <>
          <p className="font-serif text-2xl text-bone">{dados.status}</p>
          <p className="mt-1 text-sm text-mute">
            {dados.feitosSemana} de {dados.meta} esta semana
          </p>
        </>
      )}
    </Link>
  );
}