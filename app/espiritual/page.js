"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import Oracao from "@/components/espiritual/Oracao";
import Versiculos from "@/components/espiritual/Versiculos";
import HabitosEspirituais from "@/components/espiritual/HabitosEspirituais";
import PlanoLeitura from "@/components/espiritual/PlanoLeitura";
import { getQuoteForDate } from "@/lib/quotes";

const ABAS = [
  { key: "leitura", label: "Leitura" },
  { key: "oracao", label: "Oração" },
  { key: "versiculos", label: "Versículos" },
];

export default function EspiritualPage() {
  const { user, loading } = useAuth();
  const [aba, setAba] = useState("oracao");
  const quote = useMemo(() => getQuoteForDate(new Date()), []);

  if (loading || !user) return null;

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-6 py-10 md:px-12 md:py-14 pb-14">
        <p className="text-sm text-ember uppercase tracking-wide mb-1 first-letter:uppercase">
          {dateLabel}
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
          Espiritual
        </h1>
        <p className="text-sm text-mute mb-6">
          Leitura, oração e os versículos que ficam no seu coração.
        </p>

        {aba !== "versiculos" && (
          <div className="rounded-lg border-l-2 border-ember bg-panel p-4 mb-6">
            <p className="text-sm italic text-bone/90 leading-snug">
              {quote.text}
            </p>
            <p className="text-xs text-ember mt-1">— {quote.ref}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6" role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.key}
              type="button"
              role="tab"
              aria-selected={aba === a.key}
              onClick={() => setAba(a.key)}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                aba === a.key
                  ? "border-ember/60 bg-emberSoft text-bone"
                  : "border-line text-mute hover:text-bone"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {aba === "oracao" && <Oracao user={user} />}

        {aba === "versiculos" && <Versiculos user={user} quote={quote} />}

        {aba === "leitura" && (
          <div className="flex flex-col gap-4">
            <PlanoLeitura user={user} />
            <HabitosEspirituais user={user} />
          </div>
        )}
      </main>
    </div>
  );
}