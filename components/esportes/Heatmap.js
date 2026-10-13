"use client";

import {
  diasDoMes,
  primeiroDiaDaSemana,
  isoDoDia,
  mesesDaJanela,
} from "@/lib/esportesUtils";

const LETRAS = ["S", "T", "Q", "Q", "S", "S", "D"];

// porDia: { "2026-10-13": { count: 1, minutes: 45 } }
export default function Heatmap({ porDia, hoje, selecionado, onSelecionar }) {
  const meses = mesesDaJanela();

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3 lg:grid-cols-4">
      {meses.map(({ ano, mes }) => {
        const titulo = new Date(ano, mes, 1).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
        const total = diasDoMes(ano, mes);
        const vazios = primeiroDiaDaSemana(ano, mes);
        const celulas = [];

        for (let i = 0; i < vazios; i++) {
          celulas.push(<span key={`v${i}`} />);
        }

        for (let d = 1; d <= total; d++) {
          const iso = isoDoDia(ano, mes, d);
          const info = porDia[iso];
          const forte = info && (info.count >= 2 || info.minutes > 60);

          let cor = "bg-surface text-mute";
          if (info) cor = forte ? "bg-ember text-ink" : "bg-ember/40 text-bone";

          const futuro = iso > hoje ? "opacity-30" : "";
          const anel =
            iso === selecionado
              ? "ring-2 ring-bone"
              : iso === hoje
              ? "ring-1 ring-mute"
              : "";

          celulas.push(
            <button
              key={iso}
              type="button"
              onClick={() => onSelecionar(iso)}
              aria-label={`${d} de ${titulo}${info ? ", treinou" : ""}`}
              className={`flex aspect-square items-center justify-center rounded-[3px] text-[9px] leading-none ${cor} ${futuro} ${anel}`}
            >
              {d}
            </button>
          );
        }

        return (
          <div key={`${ano}-${mes}`} className="min-w-0">
            <p className="mb-1.5 text-xs text-mute first-letter:uppercase">
              {titulo}
            </p>
            <div className="mb-[3px] grid grid-cols-7 gap-[3px]">
              {LETRAS.map((l, i) => (
                <span key={i} className="text-center text-[9px] text-mute/70">
                  {l}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-[3px]">{celulas}</div>
          </div>
        );
      })}
    </div>
  );
}