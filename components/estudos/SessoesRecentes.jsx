"use client";

import { useState } from "react";
import { diaCurto, formatarMinutos } from "@/lib/esportesUtils";

export default function SessoesRecentes({ sessoes, materias, onEditar, onApagar }) {
  const [visiveis, setVisiveis] = useState(10);
  const porId = {};
  materias.forEach((m) => {
    porId[m.id] = m;
  });

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="mb-4 text-xs uppercase tracking-wide text-mute">Sessões recentes</p>

      {sessoes.length === 0 ? (
        <p className="text-sm text-mute">
          Nenhuma sessão ainda. Toque em &quot;Registrar sessão&quot; pra começar.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {sessoes.slice(0, visiveis).map((s) => {
              const m = s.subject_id ? porId[s.subject_id] : null;
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: m ? m.color : "rgb(var(--mute))" }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-bone">
                          {m ? m.name : "Sem matéria"}
                        </span>
                        <span className="block text-xs text-mute">
                          {diaCurto(s.day)} · {formatarMinutos(s.minutes)}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-4">
                      <button
                        type="button"
                        onClick={() => onEditar(s)}
                        className="text-xs text-ember hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onApagar(s)}
                        className="text-xs text-mute hover:text-bone"
                      >
                        Apagar
                      </button>
                    </span>
                  </div>
                  {s.note && <p className="mt-2 text-sm text-bone/90">{s.note}</p>}
                </li>
              );
            })}
          </ul>
          {sessoes.length > visiveis && (
            <button
              type="button"
              onClick={() => setVisiveis((v) => v + 10)}
              className="mt-4 text-sm text-ember hover:underline"
            >
              Ver mais
            </button>
          )}
        </>
      )}
    </div>
  );
}