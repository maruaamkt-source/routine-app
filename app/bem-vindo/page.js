"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useModulos } from "@/components/ModulosProvider";
import { MODULOS, TODOS } from "@/lib/modulos";
import { SUGESTOES, FREQUENCIAS } from "@/lib/sugestoes";

// Só as áreas escolhidas, que já estão prontas e que têm perguntas
function areasComPerguntas(escolhidos) {
  return MODULOS.filter(
    (m) => m.pronto && escolhidos.includes(m.key) && SUGESTOES[m.key]
  ).map((m) => SUGESTOES[m.key]);
}

export default function BemVindoPage() {
  const { user, loading } = useAuth();
  const { salvarModulos } = useModulos();
  const router = useRouter();

  const [etapa, setEtapa] = useState(1);
  const [escolhidos, setEscolhidos] = useState(
    MODULOS.filter((m) => m.padrao).map((m) => m.key)
  );
  const [respostas, setRespostas] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (loading || !user) return null;

  const tudo = TODOS.every((k) => escolhidos.includes(k));
  const areas = areasComPerguntas(escolhidos);

  function alternar(key) {
    setEscolhidos((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function alternarTudo() {
    setEscolhidos(tudo ? [] : [...TODOS]);
  }

  // Passo 1: salva as áreas e segue para as perguntas (se houver)
  async function continuar() {
    setErro("");
    setSalvando(true);
    const { error } = await salvarModulos(escolhidos);
    setSalvando(false);
    if (error) {
      setErro("Não consegui salvar. Confira se o SQL da tabela profiles foi rodado.");
      return;
    }
    if (areas.length === 0) {
      router.replace("/");
      return;
    }
    setEtapa(2);
  }

  function responder(id, freq) {
    setRespostas((prev) => ({ ...prev, [id]: freq }));
  }

  // Passo 2: cria só os hábitos marcados, sem duplicar nomes que já existem
  async function criarEEntrar() {
    setErro("");

    const marcados = [];
    areas.forEach((a) => {
      a.perguntas.forEach((p) => {
        const freq = respostas[p.id] || "nao";
        if (freq !== "nao") {
          marcados.push({ nome: p.habito, dias: FREQUENCIAS[freq].dias });
        }
      });
    });

    if (marcados.length === 0) {
      router.replace("/");
      return;
    }

    setSalvando(true);

    const { data: existentes, error: erroLer } = await supabase
      .from("habits")
      .select("name")
      .eq("user_id", user.id);

    if (erroLer) {
      setSalvando(false);
      setErro("Não consegui criar os hábitos agora. Tenta de novo ou toque em Pular.");
      return;
    }

    const nomes = new Set(
      (existentes ?? []).map((h) => String(h.name).trim().toLowerCase())
    );

    const novos = marcados
      .filter((m) => !nomes.has(m.nome.trim().toLowerCase()))
      .map((m) => ({
        user_id: user.id,
        name: m.nome,
        days_of_week: m.dias,
        start_time: null,
        end_time: null,
      }));

    if (novos.length > 0) {
      const { error: erroCriar } = await supabase.from("habits").insert(novos);
      if (erroCriar) {
        setSalvando(false);
        setErro("Não consegui criar os hábitos agora. Tenta de novo ou toque em Pular.");
        return;
      }
    }

    setSalvando(false);
    router.replace("/");
  }

  const cardBase = "min-w-0 text-left rounded-lg border p-5 transition-colors";

  // ---------- Passo 2: perguntas rápidas ----------
  if (etapa === 2) {
    return (
      <main className="min-h-screen px-6 py-10 md:px-12 md:py-14">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-sm text-ember uppercase tracking-wide mb-1">
            Passo 2 de 2
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
            Quer começar com alguns hábitos?
          </h1>
          <p className="text-sm text-mute mb-8">
            Marque só o que fizer sentido para você. Tudo começa em "Não" e dá
            para mudar depois na página Hábitos.
          </p>

          <div className="flex flex-col gap-6">
            {areas.map((a) => (
              <div key={a.titulo}>
                <h2 className="text-xs tracking-wide text-mute uppercase mb-3">
                  {a.titulo}
                </h2>
                <div className="flex flex-col gap-3">
                  {a.perguntas.map((p) => {
                    const atual = respostas[p.id] || "nao";
                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border border-line bg-panel p-5"
                      >
                        <p className="text-sm text-bone mb-3">{p.pergunta}</p>
                        <div
                          className="flex flex-wrap gap-2"
                          role="radiogroup"
                          aria-label={p.pergunta}
                        >
                          {p.opcoes.map((op) => (
                            <button
                              key={op}
                              type="button"
                              role="radio"
                              aria-checked={atual === op}
                              onClick={() => responder(p.id, op)}
                              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                                atual === op
                                  ? "border-ember text-ember bg-ember/10"
                                  : "border-line text-mute hover:text-bone"
                              }`}
                            >
                              {FREQUENCIAS[op].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {erro && (
            <div className="rounded-lg border-l-2 border-ember bg-panel p-4 mt-4">
              <p className="text-sm text-bone">{erro}</p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={criarEEntrar}
              disabled={salvando}
              className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
            >
              {salvando ? "Criando..." : "Criar e entrar"}
            </button>
            <button
              type="button"
              onClick={() => router.replace("/")}
              disabled={salvando}
              className="text-sm text-mute hover:text-bone transition-colors disabled:opacity-40"
            >
              Pular
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- Passo 1: escolher as áreas ----------
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