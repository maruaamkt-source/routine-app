"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useModulos } from "@/components/ModulosProvider";
import { MODULOS, TODOS } from "@/lib/modulos";

export default function BemVindoPage() {
  const { user, loading } = useAuth();
  const { salvarModulos } = useModulos();
  const router = useRouter();

  const [escolhidos, setEscolhidos] = useState(
    MODULOS.filter((m) => m.padrao).map((m) => m.key)
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (loading || !user) return null;

  const tudo = TODOS.every((k) => escolhidos.includes(k));

  function alternar(key) {
    setEscolhidos((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function alternarTudo() {
    setEscolhidos(tudo ? [] : [...TODOS]);
  }

  async function continuar() {
    setErro("");
    setSalvando(true);
    const { error } = await salvarModulos(escolhidos);
    setSalvando(false);
    if (error) {
      setErro("Não consegui salvar. Confira se o SQL da tabela profiles foi rodado.");
      return;
    }
    router.replace("/");
  }

  const cardBase = "min-w-0 text-left rounded-lg border p-5 transition-colors";

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm text-ember uppercase tracking-wide mb-1">
          Bem-vindo ao Routine
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
          O que você quer organizar?
        </h1>
        <p className="text-sm text-mute mb-8">
          Escolha uma ou mais áreas. Você pode mudar isso depois.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODULOS.map((m) => {
            const ativo = escolhidos.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                role="checkbox"
                aria-checked={ativo}
                onClick={() => alternar(m.key)}
                className={`${cardBase} ${
                  ativo
                    ? "border-ember bg-ember/10"
                    : "border-line bg-panel hover:border-mute"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {m.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-bone">{m.nome}</span>
                      {!m.pronto && (
                        <span className="text-[10px] text-mute border border-line rounded-full px-2 py-0.5">
                          em breve
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-mute mt-1">
                      {m.descricao}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 grid place-items-center w-5 h-5 rounded-full border text-[11px] ${
                      ativo
                        ? "border-ember bg-ember text-ink"
                        : "border-line text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            role="checkbox"
            aria-checked={tudo}
            onClick={alternarTudo}
            className={`${cardBase} sm:col-span-2 ${
              tudo
                ? "border-ember bg-ember/10"
                : "border-line bg-panel hover:border-mute"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none" aria-hidden="true">
                ✨
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-bone">Tudo</span>
                <span className="block text-xs text-mute mt-1">
                  Liga todas as áreas de uma vez
                </span>
              </span>
              <span
                className={`shrink-0 grid place-items-center w-5 h-5 rounded-full border text-[11px] ${
                  tudo
                    ? "border-ember bg-ember text-ink"
                    : "border-line text-transparent"
                }`}
                aria-hidden="true"
              >
                ✓
              </span>
            </div>
          </button>
        </div>

        {erro && (
          <div className="rounded-lg border-l-2 border-ember bg-panel p-4 mt-4">
            <p className="text-sm text-bone">{erro}</p>
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={continuar}
            disabled={salvando || escolhidos.length === 0}
            className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Continuar"}
          </button>
          {escolhidos.length === 0 && (
            <p className="text-xs text-mute mt-2">Escolha pelo menos uma área.</p>
          )}
        </div>
      </div>
    </main>
  );
}