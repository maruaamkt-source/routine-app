"use client";

import { planosDoDia } from "@/lib/planosUtils";
import {
  diasDoMes,
  primeiroDiaDaSemana,
  isoDoDia,
  mesesDaJanela,
} from "@/lib/esportesUtils";

const LETRAS = ["S", "T", "Q", "Q", "S", "S", "D"];

// porDia: { "2026-10-13": { count: 1, minutes: 45 } }
export default function Heatmap({ porDia, hoje, selecionado, onSelecionar, planos = [] }) {
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

          const planejado = planosDoDia(planos, iso).length > 0;
          const faltou = planejado && iso < hoje && !info;
          const futuro = iso > hoje && !planejado ? "opacity-30" : "";
          let anel = "";
          if (iso === selecionado) anel = "ring-2 ring-bone";
          else if (iso === hoje) anel = "ring-1 ring-mute";
          else if (planejado && iso > hoje) anel = "ring-1 ring-ember/60";
          else if (faltou) anel = "border border-dashed border-mute";

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