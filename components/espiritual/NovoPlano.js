"use client";

import { useState } from "react";
import { todayISO } from "@/lib/dateUtils";
import {
  BOOKS,
  MODELOS,
  MAX_DIAS,
  totalCapitulos,
  somarDias,
  formatarData,
} from "@/lib/biblia";

const CAMPO =
  "w-full text-sm bg-transparent text-bone placeholder:text-mute border border-line rounded px-3 py-2";

const ANTIGO = BOOKS.filter((b) => b.t === "AT");
const NOVO = BOOKS.filter((b) => b.t === "NT");

function numero(valor, padrao) {
  const n = parseInt(valor, 10);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

function porDiaTexto(total, dias) {
  return (total / dias).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function GrupoLivros({
  titulo,
  livros,
  selecionados,
  onAlternar,
  onMarcar,
  onLimpar,
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-xs tracking-wide text-mute uppercase">{titulo}</h3>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => onMarcar(livros)}
            className="text-ember"
          >
            Marcar todos
          </button>
          <button
            type="button"
            onClick={() => onLimpar(livros)}
            className="text-mute hover:text-bone"
          >
            Limpar
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {livros.map((b) => {
          const ativo = selecionados.includes(b.id);
          return (
            <button
              key={b.id}
              type="button"
              role="checkbox"
              aria-checked={ativo}
              onClick={() => onAlternar(b.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                ativo
                  ? "border-ember text-ember bg-ember/10"
                  : "border-line text-mute hover:text-bone"
              }`}
            >
              {b.nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NovoPlano({ onIniciar, salvando }) {
  const [modo, setModo] = useState("escolha");
  const [nome, setNome] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [ritmo, setRitmo] = useState("cpd");
  const [valor, setValor] = useState("3");

  function alternarLivro(id) {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function marcarGrupo(livros) {
    setSelecionados((prev) =>
      Array.from(new Set([...prev, ...livros.map((b) => b.id)]))
    );
  }

  function limparGrupo(livros) {
    const ids = livros.map((b) => b.id);
    setSelecionados((prev) => prev.filter((x) => !ids.includes(x)));
  }

  function trocarRitmo(r) {
    setRitmo(r);
    setValor(r === "cpd" ? "3" : "90");
  }

  // Conta do plano personalizado
  const total = totalCapitulos(selecionados);
  const limite = Math.max(1, Math.min(total, MAX_DIAS));
  const pedido =
    ritmo === "cpd"
      ? Math.ceil(total / numero(valor, 3))
      : numero(valor, 90);
  const totalDias = total > 0 ? Math.max(1, Math.min(pedido, limite)) : 0;
  const ajustado = total > 0 && pedido > limite;
  const fimPrevisto = totalDias > 0 ? somarDias(todayISO(), totalDias - 1) : "";

  async function iniciarModelo(m) {
    await onIniciar({ nome: m.nome, books: m.books, totalDias: m.dias });
  }

  async function iniciarPersonalizado() {
    if (total === 0 || salvando) return;
    await onIniciar({
      nome: nome.trim() || "Plano personalizado",
      books: BOOKS.filter((b) => selecionados.includes(b.id)).map((b) => b.id),
      totalDias,
    });
  }

  // ---------- Montar o próprio plano ----------
  if (modo === "personalizado") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-line bg-panel p-5 flex flex-col gap-4">
          <h2 className="text-xs tracking-wide text-mute uppercase">
            Plano personalizado
          </h2>

          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
            placeholder="Nome do plano (opcional)"
            className={CAMPO}
          />

          <GrupoLivros
            titulo="Antigo Testamento"
            livros={ANTIGO}
            selecionados={selecionados}
            onAlternar={alternarLivro}
            onMarcar={marcarGrupo}
            onLimpar={limparGrupo}
          />
          <GrupoLivros
            titulo="Novo Testamento"
            livros={NOVO}
            selecionados={selecionados}
            onAlternar={alternarLivro}
            onMarcar={marcarGrupo}
            onLimpar={limparGrupo}
          />

          <div>
            <h3 className="text-xs tracking-wide text-mute uppercase mb-2">
              Ritmo
            </h3>
            <div
              className="flex flex-wrap gap-2 mb-3"
              role="radiogroup"
              aria-label="Como definir o ritmo"
            >
              <button
                type="button"
                role="radio"
                aria-checked={ritmo === "cpd"}
                onClick={() => trocarRitmo("cpd")}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  ritmo === "cpd"
                    ? "border-ember text-ember bg-ember/10"
                    : "border-line text-mute hover:text-bone"
                }`}
              >
                Capítulos por dia
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={ritmo === "dias"}
                onClick={() => trocarRitmo("dias")}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  ritmo === "dias"
                    ? "border-ember text-ember bg-ember/10"
                    : "border-line text-mute hover:text-bone"
                }`}
              >
                Terminar em X dias
              </button>
            </div>
            <label className="flex flex-col gap-1 text-xs text-mute">
              {ritmo === "cpd" ? "Quantos capítulos por dia?" : "Em quantos dias?"}
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className={`${CAMPO} sm:w-40`}
              />
            </label>
          </div>

          {total === 0 ? (
            <p className="text-sm text-mute">Escolha pelo menos um livro.</p>
          ) : (
            <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
              <p className="text-sm text-bone">
                {total} capítulos em {totalDias}{" "}
                {totalDias === 1 ? "dia" : "dias"}, cerca de{" "}
                {porDiaTexto(total, totalDias)} por dia.
              </p>
              <p className="text-xs text-mute mt-1">
                Se ler todo dia, termina em {formatarData(fimPrevisto)}.
              </p>
              {ajustado && (
                <p className="text-xs text-mute mt-1">
                  Ajustei para o máximo possível com esses livros: {limite}{" "}
                  dias.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={iniciarPersonalizado}
              disabled={total === 0 || salvando}
              className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
            >
              {salvando ? "Criando..." : "Começar plano"}
            </button>
            <button
              type="button"
              onClick={() => setModo("escolha")}
              disabled={salvando}
              className="text-sm text-mute hover:text-bone disabled:opacity-40"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Escolher um modelo pronto ----------
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xs tracking-wide text-mute uppercase mb-2">
          Plano de leitura bíblica
        </h2>
        <p className="text-sm text-mute">
          Escolha um modelo pronto ou monte o seu. O app só diz o que ler em
          cada dia; o texto você lê na sua Bíblia. Se atrasar, o plano espera
          por você.
        </p>
      </div>

      {MODELOS.map((m) => {
        const t = totalCapitulos(m.books);
        return (
          <div
            key={m.key}
            className="min-w-0 rounded-lg border border-line bg-panel p-5 flex flex-col gap-2"
          >
            <p className="text-bone">{m.nome}</p>
            <p className="text-sm text-mute">{m.descricao}</p>
            <p className="text-xs text-mute">
              {t} capítulos · {m.dias} dias · cerca de {porDiaTexto(t, m.dias)}{" "}
              por dia
            </p>
            <div className="mt-1">
              <button
                type="button"
                onClick={() => iniciarModelo(m)}
                disabled={salvando}
                className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
              >
                {salvando ? "Criando..." : "Começar este plano"}
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setModo("personalizado")}
        className="rounded-lg border border-line bg-panel p-5 text-left hover:border-mute transition-colors"
      >
        <span className="block text-bone">Plano personalizado</span>
        <span className="block text-sm text-mute mt-1">
          Escolha os livros e o ritmo de leitura.
        </span>
      </button>
    </div>
  );
}