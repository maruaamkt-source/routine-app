"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getWeekDates, toISODate } from "@/lib/dateUtils";
import { formatarNumero } from "@/lib/esportesUtils";
import { GRUPOS } from "@/lib/gruposMusculares";

export default function VolumeSemana({ user }) {
  const [linhas, setLinhas] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    const semana = getWeekDates().map((d) => toISODate(d));
    const inicio = semana[0];
    const fim = semana[semana.length - 1];

    async function buscar() {
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("muscle_group, sets, reps, weight_kg, workouts!inner(day)")
        .eq("user_id", user.id)
        .gte("workouts.day", inicio)
        .lte("workouts.day", fim)
        .limit(1000);

      if (cancelado) return;
      if (error) {
        setErro("Não consegui carregar o volume da semana: " + error.message);
        setLinhas([]);
        return;
      }
      setLinhas(data || []);
    }

    buscar();
    return () => {
      cancelado = true;
    };
  }, [user.id]);

  if (linhas === null) return null;

  const SEM = "Sem grupo";
  const tot = {};
  GRUPOS.forEach((g) => {
    tot[g] = { vol: 0, series: 0 };
  });
  linhas.forEach((l) => {
    const g = l.muscle_group && tot[l.muscle_group] ? l.muscle_group : SEM;
    if (!tot[g]) tot[g] = { vol: 0, series: 0 };
    tot[g].vol += (Number(l.sets) || 0) * (Number(l.reps) || 0) * (Number(l.weight_kg) || 0);
    tot[g].series += Number(l.sets) || 0;
  });

  const lista = Object.entries(tot)
    .filter(([g, v]) => g !== SEM || v.series > 0)
    .map(([g, v]) => ({ g, ...v }))
    .sort((a, b) => b.vol - a.vol || b.series - a.series);

  const maxVol = Math.max(...lista.map((x) => x.vol));
  const usarVolume = maxVol > 0;
  const maxBase = usarVolume ? maxVol : Math.max(...lista.map((x) => x.series));

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="mb-4 text-xs uppercase tracking-wide text-mute">
        Volume da semana por grupo (séries × reps × kg)
      </p>

      {erro && <p className="mb-3 text-sm text-bone">{erro}</p>}

      <ul className="space-y-3">
        {lista.map((x) => {
          const base = usarVolume ? x.vol : x.series;
          const pct = maxBase > 0 ? Math.round((base / maxBase) * 100) : 0;
          return (
            <li key={x.g}>
              <div className="mb-1 flex justify-between text-sm">
                <span className={x.series === 0 ? "text-mute" : "text-bone"}>{x.g}</span>
                <span className="text-mute">
                  {formatarNumero(x.vol)} kg · {x.series}{" "}
                  {x.series === 1 ? "série" : "séries"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-ember" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      {tot[SEM] && tot[SEM].series > 0 && (
        <p className="mt-4 text-xs text-mute">
          &quot;Sem grupo&quot; são exercícios sem grupo muscular escolhido.
        </p>
      )}
    </div>
  );
}