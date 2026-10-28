"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getWeekDates, toISODate } from "@/lib/dateUtils";
import { formatarMinutos } from "@/lib/esportesUtils";

export default function CardEstudos({ userId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function carregar() {
      const dias = getWeekDates(new Date()).map((d) => toISODate(d));

      const [s, c] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("minutes")
          .eq("user_id", userId)
          .gte("day", dias[0])
          .lte("day", dias[6]),
        supabase
          .from("health_settings")
          .select("study_weekly_hours")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (cancelado) return;
      if (s.error || c.error) {
        setDados({ erro: true });
        return;
      }

      const minutos = (s.data || []).reduce((t, x) => t + (x.minutes || 0), 0);
      const metaHoras =
        c.data && c.data.study_weekly_hours
          ? Number(c.data.study_weekly_hours)
          : 5;
      const metaMin = Math.round(metaHoras * 60);
      const pct = metaMin > 0 ? Math.min(100, Math.round((minutos / metaMin) * 100)) : 0;

      setDados({ minutos, metaMin, pct });
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  return (
    <Link
      href="/estudos"
      className="block min-w-0 rounded-lg border border-line bg-panel p-5 hover:border-ember"
    >
      <p className="mb-3 text-xs uppercase tracking-wide text-mute">Estudos</p>
      {!dados ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : dados.erro ? (
        <p className="text-sm text-mute">Não consegui carregar.</p>
      ) : (
        <>
          <p className="font-serif text-2xl text-bone">
            {formatarMinutos(dados.minutos)}{" "}
            <span className="text-sm text-mute">
              de {formatarMinutos(dados.metaMin)}
            </span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-ember transition-all"
              style={{ width: `${dados.pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-mute">{dados.pct}% da meta da semana</p>
        </>
      )}
    </Link>
  );
}