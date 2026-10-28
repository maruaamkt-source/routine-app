"use client";

import Heatmap from "@/components/esportes/Heatmap";
import { diaCurto, formatarMinutos } from "@/lib/esportesUtils";

export default function HeatmapEstudos({
  sessoes,
  materias,
  hoje,
  selecionado,
  onSelecionar,
}) {
  // Resumo por dia. "forte" no Heatmap = 2 sessões ou mais de 60 min
  const porDia = {};
  sessoes.forEach((s) => {
    const info = porDia[s.day] || { count: 0, minutes: 0 };
    info.count += 1;
    info.minutes += s.minutes || 0;
    porDia[s.day] = info;
  });

  const porId = {};
  materias.forEach((m) => {
    porId[m.id] = m;
  });

  const doDia = sessoes.filter((s) => s.day === selecionado);
  const totalDia = doDia.reduce((soma, s) => soma + s.minutes, 0);

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="mb-4 text-xs uppercase tracking-wide text-mute">
        Dias estudados (12 meses)
      </p>
      <Heatmap
        porDia={porDia}
        hoje={hoje}
        selecionado={selecionado}
        onSelecionar={onSelecionar}
      />
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-ember/40" /> Estudou
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-ember" /> 2 sessões ou mais de 60 min
        </span>
      </div>

      {selecionado && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-3 text-sm text-bone">
            {diaCurto(selecionado)}
            {doDia.length > 0 ? ` · ${formatarMinutos(totalDia)}` : ""}
          </p>
          {doDia.length === 0 ? (
            <p className="text-sm text-mute">Nenhuma sessão neste dia.</p>
          ) : (
            <ul className="space-y-2">
              {doDia.map((s) => {
                const m = s.subject_id ? porId[s.subject_id] : null;
                return (
                  <li
                    key={s.id}
                    className="rounded-lg border border-line bg-surface px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: m ? m.color : "rgb(var(--mute))" }}
                        />
                        <span className="truncate text-sm text-bone">
                          {m ? m.name : "Sem matéria"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-mute">
                        {formatarMinutos(s.minutes)}
                      </span>
                    </div>
                    {s.note && <p className="mt-2 text-sm text-bone/90">{s.note}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}