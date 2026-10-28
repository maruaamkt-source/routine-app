"use client";

import { getWeekDates, toISODate } from "@/lib/dateUtils";
import { formatarMinutos } from "@/lib/esportesUtils";

export default function ResumoEstudos({ sessoes, materias, metaHoras, onMudarMeta }) {
  const semana = getWeekDates().map((d) => toISODate(d));
  const ini = semana[0];
  const fim = semana[semana.length - 1];
  const prefixoMes = toISODate(new Date()).slice(0, 7);

  let minSemana = 0;
  let minMes = 0;
  const porMateria = {};
  const diasSemana = new Set();

  sessoes.forEach((s) => {
    if (s.day.startsWith(prefixoMes)) minMes += s.minutes;
    if (s.day >= ini && s.day <= fim) {
      minSemana += s.minutes;
      diasSemana.add(s.day);
      const chave = s.subject_id || "sem";
      porMateria[chave] = (porMateria[chave] || 0) + s.minutes;
    }
  });

  const metaMin = Math.round(Number(metaHoras) * 60);
  const pct = metaMin > 0 ? Math.min(100, Math.round((minSemana / metaMin) * 100)) : 0;

  const porId = {};
  materias.forEach((m) => {
    porId[m.id] = m;
  });

  const lista = Object.entries(porMateria)
    .map(([id, min]) => ({
      id,
      min,
      nome: id === "sem" ? "Sem matéria" : porId[id] ? porId[id].name : "Sem matéria",
      cor: id !== "sem" && porId[id] ? porId[id].color : "rgb(var(--mute))",
    }))
    .sort((a, b) => b.min - a.min);
  const maior = lista.length > 0 ? lista[0].min : 0;

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-mute">Meta da semana</p>
        <div className="flex items-center gap-3 text-sm text-mute">
          <button
            type="button"
            onClick={() => onMudarMeta(-1)}
            aria-label="Diminuir meta"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:text-bone"
          >
            −
          </button>
          <span className="text-bone">{Number(metaHoras)}h</span>
          <button
            type="button"
            onClick={() => onMudarMeta(1)}
            aria-label="Aumentar meta"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:text-bone"
          >
            +
          </button>
        </div>
      </div>

      <p className="mb-2 font-serif text-2xl text-bone">
        {formatarMinutos(minSemana)} de {Number(metaHoras)}h esta semana
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-ember" style={{ width: `${pct}%` }} />
      </div>
      {minSemana >= metaMin && metaMin > 0 && (
        <p className="mt-2 text-xs text-ember">Meta da semana batida!</p>
      )}
      <p className="mt-3 text-xs text-mute">
        {diasSemana.size} {diasSemana.size === 1 ? "dia estudado" : "dias estudados"} na
        semana · Este mês: {formatarMinutos(minMes)}
      </p>

      {lista.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-mute">
            Por matéria (semana)
          </p>
          <ul className="space-y-3">
            {lista.map((x) => (
              <li key={x.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-bone">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: x.cor }}
                    />
                    <span className="truncate">{x.nome}</span>
                  </span>
                  <span className="shrink-0 text-mute">{formatarMinutos(x.min)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maior > 0 ? Math.round((x.min / maior) * 100) : 0}%`,
                      backgroundColor: x.cor,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}