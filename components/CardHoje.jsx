"use client";

import { planosDoDia, planoFeito } from "@/lib/planosUtils";

export default function CardHoje({ planos, treinos, hoje, registrando, onRegistrar, onAjustar }) {
  const doDia = planosDoDia(planos, hoje);
  if (doDia.length === 0) return null;

  return (
    <div className="rounded-lg border border-ember bg-panel p-5">
      <p className="mb-3 text-xs uppercase tracking-wide text-ember">Hoje</p>
      <ul className="space-y-2">
        {doDia.map((p) => {
          const ok = planoFeito(p, hoje, treinos);
          const ocupado = registrando === p.id + hoje;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-bone">{p.name}</span>
                <span className="block text-xs text-mute">
                  {p.type}
                  {(p.exercises || []).length > 0 ? ` · ${p.exercises.length} exercícios` : ""}
                </span>
              </span>
              {ok ? (
                <span className="shrink-0 text-xs text-ember">Feito ✓</span>
              ) : (
                <span className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onAjustar(p, hoje)}
                    className="text-xs text-ember hover:underline"
                  >
                    Ajustar
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => onRegistrar(p, hoje)}
                    className="rounded-lg bg-ember px-3 py-1 text-xs font-medium text-ink disabled:opacity-50"
                  >
                    {ocupado ? "..." : "Marcar feito"}
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}