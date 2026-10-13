"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatarNumero, resumoExercicio } from "@/lib/esportesUtils";

const W = 320;
const H = 170;
const PL = 38;
const PR = 12;
const PT = 12;
const PB = 26;

function dataCurta(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function Grafico({ pontos }) {
  const pesos = pontos.map((p) => p.weight_kg);
  let lo = Math.min(...pesos);
  let hi = Math.max(...pesos);
  if (lo === hi) {
    lo = Math.max(0, lo - 1);
    hi = hi + 1;
  } else {
    const folga = (hi - lo) * 0.1;
    lo = Math.max(0, lo - folga);
    hi = hi + folga;
  }

  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const x = (i) =>
    pontos.length === 1 ? PL + innerW / 2 : PL + (i * innerW) / (pontos.length - 1);
  const y = (v) => PT + innerH - ((v - lo) / (hi - lo)) * innerH;
  const marcas = [hi, (hi + lo) / 2, lo];
  const linha = pontos.map((p, i) => `${x(i)},${y(p.weight_kg)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução da carga">
      {marcas.map((m, i) => (
        <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(m)} y2={y(m)} className="stroke-line" strokeWidth="1" />
          <text x={PL - 6} y={y(m) + 3} textAnchor="end" fontSize="10" className="fill-mute">
            {formatarNumero(Math.round(m * 10) / 10)}
          </text>
        </g>
      ))}

      {pontos.length > 1 && (
        <polyline
          points={linha}
          fill="none"
          className="stroke-ember"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {pontos.map((p, i) => (
        <circle key={p.day} cx={x(i)} cy={y(p.weight_kg)} r="3" className="fill-ember" />
      ))}

      {pontos.length === 1 ? (
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" className="fill-mute">
          {dataCurta(pontos[0].day)}
        </text>
      ) : (
        <>
          <text x={PL} y={H - 8} textAnchor="start" fontSize="10" className="fill-mute">
            {dataCurta(pontos[0].day)}
          </text>
          <text x={W - PR} y={H - 8} textAnchor="end" fontSize="10" className="fill-mute">
            {dataCurta(pontos[pontos.length - 1].day)}
          </text>
        </>
      )}
    </svg>
  );
}

export default function Evolucao({ user, nomes }) {
  const [escolhido, setEscolhido] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // Começa pelo exercício usado mais recentemente
  useEffect(() => {
    if (!escolhido && nomes.length > 0) setEscolhido(nomes[0]);
  }, [nomes, escolhido]);

  useEffect(() => {
    if (!escolhido) return;
    let cancelado = false;

    async function buscar() {
      setCarregando(true);
      setErro("");
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("sets, reps, weight_kg, workouts!inner(day)")
        .eq("user_id", user.id)
        .eq("name", escolhido)
        .limit(1000);

      if (cancelado) return;
      if (error) {
        setErro("Não consegui carregar a evolução: " + error.message);
        setLinhas([]);
      } else {
        setLinhas(data || []);
      }
      setCarregando(false);
    }

    buscar();
    return () => {
      cancelado = true;
    };
  }, [escolhido, user.id]);

  if (nomes.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="text-sm text-mute">
          Registre um treino de musculação com exercícios e a evolução da carga aparece aqui.
        </p>
      </div>
    );
  }

  const normal = linhas
    .map((l) => {
      const w = Array.isArray(l.workouts) ? l.workouts[0] : l.workouts;
      return {
        day: w ? w.day : null,
        sets: l.sets,
        reps: l.reps,
        weight_kg: Number(l.weight_kg) || 0,
      };
    })
    .filter((l) => l.day);

  // Melhor série de cada dia (maior carga; empate, mais repetições)
  const porDia = {};
  normal.forEach((l) => {
    const atual = porDia[l.day];
    if (
      !atual ||
      l.weight_kg > atual.weight_kg ||
      (l.weight_kg === atual.weight_kg && l.reps > atual.reps)
    ) {
      porDia[l.day] = l;
    }
  });
  const todosPontos = Object.values(porDia).sort((a, b) => a.day.localeCompare(b.day));
  const pontos = todosPontos.slice(-40);
  const temCarga = normal.some((l) => l.weight_kg > 0);

  let maiorCarga = null;
  let maiorVolume = null;
  normal.forEach((l) => {
    if (l.weight_kg <= 0) return;
    if (
      !maiorCarga ||
      l.weight_kg > maiorCarga.weight_kg ||
      (l.weight_kg === maiorCarga.weight_kg && l.reps > maiorCarga.reps)
    ) {
      maiorCarga = l;
    }
    const vol = l.sets * l.reps * l.weight_kg;
    if (!maiorVolume || vol > maiorVolume.vol) maiorVolume = { ...l, vol };
  });

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-panel p-5">
        <label className="mb-1 block text-xs uppercase tracking-wide text-mute">Exercício</label>
        <select
          value={escolhido}
          onChange={(e) => setEscolhido(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone focus:border-ember focus:outline-none"
        >
          {nomes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <div className="rounded-lg border-l-2 border-ember bg-panel p-4 text-sm text-bone">
          {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : (
        <>
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="mb-3 text-xs uppercase tracking-wide text-mute">
              Carga ao longo do tempo (kg)
            </p>
            {temCarga && pontos.length > 0 ? (
              <>
                <Grafico pontos={pontos} />
                <p className="mt-2 text-xs text-mute">
                  Melhor série de cada dia
                  {todosPontos.length > 40 ? " (últimas 40 sessões)" : ""}.
                </p>
              </>
            ) : (
              <p className="text-sm text-mute">
                Esse exercício ainda não tem carga registrada (só peso do corpo).
              </p>
            )}
          </div>

          {temCarga && (
            <div className="rounded-lg border border-line bg-panel p-5">
              <p className="mb-3 text-xs uppercase tracking-wide text-mute">Recordes</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {maiorCarga && (
                  <div className="rounded-lg border-l-2 border-ember bg-surface p-4">
                    <p className="text-xs text-mute">Maior carga</p>
                    <p className="font-serif text-2xl text-bone">
                      {formatarNumero(maiorCarga.weight_kg)} kg
                    </p>
                    <p className="text-xs text-mute">
                      {maiorCarga.sets} × {maiorCarga.reps} em {dataCurta(maiorCarga.day)}
                    </p>
                  </div>
                )}
                {maiorVolume && (
                  <div className="rounded-lg border-l-2 border-ember bg-surface p-4">
                    <p className="text-xs text-mute">Maior volume (séries × reps × kg)</p>
                    <p className="font-serif text-2xl text-bone">
                      {formatarNumero(maiorVolume.vol)} kg
                    </p>
                    <p className="text-xs text-mute">
                      {resumoExercicio(maiorVolume)} em {dataCurta(maiorVolume.day)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {todosPontos.length > 0 && (
            <div className="rounded-lg border border-line bg-panel p-5">
              <p className="mb-3 text-xs uppercase tracking-wide text-mute">Últimas sessões</p>
              <ul className="space-y-1.5">
                {[...todosPontos]
                  .reverse()
                  .slice(0, 5)
                  .map((p) => (
                    <li key={p.day} className="flex justify-between text-sm">
                      <span className="text-mute">{dataCurta(p.day)}</span>
                      <span className="text-bone">{resumoExercicio(p)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}