"use client";

import { useEffect, useState } from "react";

export function useToque() {
  const [toque, setToque] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setToque(mq.matches);
    const f = (e) => setToque(e.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return toque;
}

export default function SugestoesExercicio({ valor, opcoes, onEscolher }) {
  const t = valor.trim().toLowerCase();
  if (t.length < 1) return null;
  const lista = opcoes
    .filter((o) => o.toLowerCase().includes(t) && o.toLowerCase() !== t)
    .slice(0, 6);
  if (lista.length === 0) return null;

  return (
    <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-line bg-panel shadow-lg">
      {lista.map((o) => (
        <li key={o}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onEscolher(o)}
            className="block w-full px-3 py-2.5 text-left text-sm text-bone hover:bg-surface"
          >
            {o}
          </button>
        </li>
      ))}
    </ul>
  );
}