"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";

function formatISO(iso) {
  if (!iso) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function formatCreated(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("pt-BR");
}

const CAMPO =
  "w-full text-sm bg-transparent text-bone placeholder:text-mute border border-line rounded px-3 py-2";

export default function Oracao({ user }) {
  const [itens, setItens] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [erro, setErro] = useState("");
  const [sub, setSub] = useState("abertos");

  const [titulo, setTitulo] = useState("");
  const [detalhes, setDetalhes] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [respondendoId, setRespondendoId] = useState(null);
  const [dataResp, setDataResp] = useState(todayISO());
  const [notaResp, setNotaResp] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    supabase
      .from("prayers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          setErro("Não consegui carregar os pedidos. Confira se o SQL da tabela prayers foi rodado.");
        } else {
          setItens(data ?? []);
        }
        setFetching(false);
      });
    return () => {
      cancelado = true;
    };
  }, [user]);

  async function adicionar(e) {
    e.preventDefault();
    if (!titulo.trim() || salvando) return;
    setErro("");
    setSalvando(true);
    const { data, error } = await supabase
      .from("prayers")
      .insert({
        user_id: user.id,
        title: titulo.trim(),
        details: detalhes.trim() || null,
      })
      .select()
      .single();
    setSalvando(false);
    if (error) {
      setErro("Não consegui salvar o pedido. Tenta de novo.");
      return;
    }
    setItens((prev) => [data, ...prev]);
    setTitulo("");
    setDetalhes("");
  }

  function abrirResposta(item) {
    setRespondendoId(item.id);
    setDataResp(todayISO());
    setNotaResp("");
  }

  async function confirmarResposta(item) {
    setErro("");
    const changes = {
      answered: true,
      answered_at: dataResp || todayISO(),
      answer_note: notaResp.trim() || null,
    };
    const { error } = await supabase
      .from("prayers")
      .update(changes)
      .eq("id", item.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui marcar como respondido. Tenta de novo.");
      return;
    }
    setItens((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, ...changes } : p))
    );
    setRespondendoId(null);
  }

  async function reabrir(item) {
    setErro("");
    const changes = { answered: false, answered_at: null, answer_note: null };
    const { error } = await supabase
      .from("prayers")
      .update(changes)
      .eq("id", item.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui reabrir o pedido. Tenta de novo.");
      return;
    }
    setItens((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, ...changes } : p))
    );
  }

  async function apagar(item) {
    if (!window.confirm("Apagar este pedido de oração?")) return;
    setErro("");
    const { error } = await supabase
      .from("prayers")
      .delete()
      .eq("id", item.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui apagar o pedido. Tenta de novo.");
      return;
    }
    setItens((prev) => prev.filter((p) => p.id !== item.id));
  }

  const abertos = itens.filter((p) => !p.answered);
  const respondidos = itens
    .filter((p) => p.answered)
    .sort((a, b) => (b.answered_at ?? "").localeCompare(a.answered_at ?? ""));
  const lista = sub === "abertos" ? abertos : respondidos;

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
          <p className="text-sm text-bone">{erro}</p>
        </div>
      )}

      <form
        onSubmit={adicionar}
        className="rounded-lg border border-line bg-panel p-5 flex flex-col gap-3"
      >
        <h2 className="text-xs tracking-wide text-mute uppercase">
          Novo pedido de oração
        </h2>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={120}
          placeholder="Pelo que você quer orar?"
          className={CAMPO}
        />
        <textarea
          value={detalhes}
          onChange={(e) => setDetalhes(e.target.value)}
          rows={3}
          placeholder="Detalhes (opcional)"
          className={CAMPO}
        />
        <div>
          <button
            type="submit"
            disabled={!titulo.trim() || salvando}
            className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Adicionar pedido"}
          </button>
        </div>
      </form>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSub("abertos")}
          className={`text-sm px-4 py-2 rounded-full border transition-colors ${
            sub === "abertos"
              ? "border-ember text-ember bg-ember/10"
              : "border-line text-mute hover:text-bone"
          }`}
        >
          Em oração ({abertos.length})
        </button>
        <button
          type="button"
          onClick={() => setSub("respondidos")}
          className={`text-sm px-4 py-2 rounded-full border transition-colors ${
            sub === "respondidos"
              ? "border-ember text-ember bg-ember/10"
              : "border-line text-mute hover:text-bone"
          }`}
        >
          Respondidos ({respondidos.length})
        </button>
      </div>

      {fetching ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : lista.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="text-sm text-mute">
            {sub === "abertos"
              ? "Nenhum pedido em oração agora."
              : "Nenhuma oração respondida ainda."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((p) => (
            <div
              key={p.id}
              className="min-w-0 rounded-lg border border-line bg-panel p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-bone break-words">{p.title}</p>
                  {p.details && (
                    <p className="text-sm text-mute mt-1 whitespace-pre-wrap break-words">
                      {p.details}
                    </p>
                  )}
                  <p className="text-xs text-mute mt-2">
                    Pedido em {formatCreated(p.created_at)}
                  </p>
                </div>
              </div>

              {p.answered && (
                <div className="rounded-lg border-l-2 border-ember bg-panel p-4 mt-3">
                  <p className="text-xs text-ember">
                    Respondida em {formatISO(p.answered_at)}
                  </p>
                  {p.answer_note && (
                    <p className="text-sm text-bone/90 mt-1 whitespace-pre-wrap break-words">
                      {p.answer_note}
                    </p>
                  )}
                </div>
              )}

              {respondendoId === p.id && (
                <div className="mt-3 pt-3 border-t border-line flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-xs text-mute">
                    Data da resposta
                    <input
                      type="date"
                      value={dataResp}
                      onChange={(e) => setDataResp(e.target.value)}
                      className="text-sm bg-transparent text-bone border border-line rounded px-2 py-1.5"
                    />
                  </label>
                  <textarea
                    value={notaResp}
                    onChange={(e) => setNotaResp(e.target.value)}
                    rows={3}
                    placeholder="Como Deus respondeu? (opcional)"
                    className={CAMPO}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => confirmarResposta(p)}
                      className="rounded-lg bg-ember px-4 py-2 text-sm font-medium text-ink"
                    >
                      Salvar resposta
                    </button>
                    <button
                      type="button"
                      onClick={() => setRespondendoId(null)}
                      className="text-sm text-mute hover:text-bone"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 text-sm">
                {!p.answered && respondendoId !== p.id && (
                  <button
                    type="button"
                    onClick={() => abrirResposta(p)}
                    className="text-ember"
                  >
                    Marcar como respondida
                  </button>
                )}
                {p.answered && (
                  <button
                    type="button"
                    onClick={() => reabrir(p)}
                    className="text-mute hover:text-bone"
                  >
                    Reabrir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => apagar(p)}
                  className="text-mute hover:text-bone"
                >
                  Apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}