"use client";

import Link from "next/link";

export default function CardRotina({
  carregando,
  tarefasFeitas,
  tarefasTotal,
  habitosFeitos,
  habitosTotal,
}) {
  return (
    <Link
      href="/habits"
      className="block min-w-0 rounded-lg border border-line bg-panel p-5 hover:border-ember"
    >
      <p className="mb-3 text-xs uppercase tracking-wide text-mute">Rotina</p>
      {carregando ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : (
        <div className="flex gap-8">
          <div>
            <p className="font-serif text-2xl text-bone tabular-nums">
              {tarefasFeitas}/{tarefasTotal}
            </p>
            <p className="mt-1 text-xs text-mute">tarefas de hoje</p>
          </div>
          <div>
            <p className="font-serif text-2xl text-bone tabular-nums">
              {habitosFeitos}/{habitosTotal}
            </p>
            <p className="mt-1 text-xs text-mute">hábitos de hoje</p>
          </div>
        </div>
      )}
    </Link>
  );
}