"use client";

import { useState } from "react";
import { formatarNumero } from "@/lib/esportesUtils";
import { MEDIDAS, dataCurta } from "@/lib/saudeUtils";

const W = 320;
const H = 170;
const PL = 38;
const PR = 12;
const PT = 12;
const PB = 26;

function Grafico({ pontos }) {
  const valores = pontos.map((p) => p.valor);
  let lo = Math.min(...valores);
  let hi = Math.max(...valores);
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
  const linha = pontos.map((p, i) => `${x(i)},${y(p.valor)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução da medida">
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
        <circle key={p.day} cx={x(i)} cy={y(p.valor)} r="3" className="fill-ember" />
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

export default function EvolucaoCorpo({ medidas }) {
  const [chave, setChave] = useState("weight_kg");
  const med = MEDIDAS.find((m) => m.key === chave) || MEDIDAS[0];

  // "medidas" já vem ordenada do mais novo pro mais antigo,
  // então o primeiro registro de cada dia é o último que você lançou naquele dia.
  const porDia = {};
  medidas.forEach((r) => {
    const v = r[chave];
    if (v === null || v === undefined) return;
    if (!porDia[r.day]) porDia[r.day] = { day: r.day, valor: Number(v) };
  });
  const todos = Object.values(porDia).sort((a, b) => a.day.localeCompare(b.day));
  const pontos = todos.slice(-40);

  const primeiro = todos.length > 0 ? todos[0] : null;
  const atual = todos.length > 0 ? todos[todos.length - 1] : null;
  const dif = primeiro && atual ? atual.valor - primeiro.valor : 0;
  const sinal = dif > 0 ? "+" : dif < 0 ? "−" : "";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-panel p-5">
        <label className="mb-1 block text-xs uppercase tracking-wide text-mute">Medida</label>
        <select
          value={chave}
          onChange={(e) => setChave(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone focus:border-ember focus:outline-none"
        >
          {MEDIDAS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="mb-3 text-xs uppercase tracking-wide text-mute">
          {med.label} ao longo do tempo ({med.unidade})
        </p>
        {pontos.length === 0 ? (
          <p className="text-sm text-mute">
            Ainda não tem registro de {med.label.toLowerCase()}. Lance na aba &quot;Peso e
            medidas&quot;.
          </p>
        ) : (
          <>
            <Grafico pontos={pontos} />
            {pontos.length === 1 && (
              <p className="mt-2 text-xs text-mute">
                Com 1 registro só aparece um ponto. A linha precisa de 2 ou mais dias.
              </p>
            )}
            {todos.length > 40 && (
              <p className="mt-2 text-xs text-mute">Mostrando os últimos 40 dias com registro.</p>
            )}
          </>
        )}
      </div>

      {primeiro && atual && (
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-mute">Resumo</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border-l-2 border-ember bg-surface p-4">
              <p className="text-xs text-mute">Primeiro</p>
              <p className="font-serif text-2xl text-bone">
                {formatarNumero(primeiro.valor)} {med.unidade}
              </p>
              <p className="text-xs text-mute">{dataCurta(primeiro.day)}</p>
            </div>
            <div className="rounded-lg border-l-2 border-ember bg-surface p-4">
              <p className="text-xs text-mute">Atual</p>
              <p className="font-serif text-2xl text-bone">
                {formatarNumero(atual.valor)} {med.unidade}
              </p>
              <p className="text-xs text-mute">{dataCurta(atual.day)}</p>
            </div>
            <div className="rounded-lg border-l-2 border-ember bg-surface p-4">
              <p className="text-xs text-mute">Diferença</p>
              <p className="font-serif text-2xl text-bone">
                {sinal}
                {formatarNumero(Math.abs(Math.round(dif * 100) / 100))} {med.unidade}
              </p>
              <p className="text-xs text-mute">do primeiro ao atual</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}