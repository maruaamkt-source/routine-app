"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const CAMPO =
  "w-full text-sm bg-transparent text-bone placeholder:text-mute border border-line rounded px-3 py-2";

function normalizar(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function Versiculos({ user, quote }) {
  const [itens, setItens] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [referencia, setReferencia] = useState("");
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvandoHoje, setSalvandoHoje] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [notaEdit, setNotaEdit] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    supabase
      .from("favorite_verses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          setErro(
            "Não consegui carregar os versículos. Confira se o SQL da tabela favorite_verses foi rodado."
          );
        } else {
          setItens(data ?? []);
        }
        setFetching(false);
      });
    return () => {
      cancelado = true;
    };
  }, [user]);

  const jaFavoritado = itens.some(
    (i) => normalizar(i.reference) === normalizar(quote.ref)
  );

  const filtrados = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return itens;
    return itens.filter((i) =>
      normalizar(`${i.reference} ${i.text} ${i.note ?? ""}`).includes(termo)
    );
  }, [itens, busca]);

  async function favoritarHoje() {
    if (jaFavoritado || salvandoHoje) return;
    setErro("");
    setSalvandoHoje(true);
    const { data, error } = await supabase
      .from("favorite_verses")
      .insert({
        user_id: user.id,
        reference: quote.ref,
        text: quote.text,
        note: null,
      })
      .select()
      .single();
    setSalvandoHoje(false);
    if (error) {
      setErro("Não consegui favoritar o versículo. Tenta de novo.");
      return;
    }
    setItens((prev) => [data, ...prev]);
  }

  async function adicionar(e) {
    e.preventDefault();
    if (!referencia.trim() || !texto.trim() || salvando) return;
    setErro("");
    setSalvando(true);
    const { data, error } = await supabase
      .from("favorite_verses")
      .insert({
        user_id: user.id,
        reference: referencia.trim(),
        text: texto.trim(),
        note: nota.trim() || null,
      })
      .select()
      .single();
    setSalvando(false);
    if (error) {
      setErro("Não consegui salvar o versículo. Tenta de novo.");
      return;
    }
    setItens((prev) => [data, ...prev]);
    setReferencia("");
    setTexto("");
    setNota("");
    setFormAberto(false);
  }

  function abrirEdicao(item) {
    setEditandoId(item.id);
    setNotaEdit(item.note ?? "");
  }

  async function salvarNota(item) {
    setErro("");
    const changes = { note: notaEdit.trim() || null };
    const { error } = await supabase
      .from("favorite_verses")
      .update(changes)
      .eq("id", item.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui salvar a anotação. Tenta de novo.");
      return;
    }
    setItens((prev) =>
      prev.map((v) => (v.id === item.id ? { ...v, ...changes } : v))
    );
    setEditandoId(null);
  }

  async function apagar(item) {
    if (!window.confirm("Apagar este versículo dos favoritos?")) return;
    setErro("");
    const { error } = await supabase
      .from("favorite_verses")
      .delete()
      .eq("id", item.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui apagar o versículo. Tenta de novo.");
      return;
    }
    setItens((prev) => prev.filter((v) => v.id !== item.id));
  }

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
          <p className="text-sm text-bone">{erro}</p>
        </div>
      )}

      <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
        <p className="text-xs tracking-wide text-mute uppercase mb-2">
          Versículo de hoje
        </p>
        <p className="text-sm italic text-bone/90 leading-snug">{quote.text}</p>
        <p className="text-xs text-ember mt-1">— {quote.ref}</p>
        <div className="mt-3">
          {jaFavoritado ? (
            <span className="text-sm text-mute">Favoritado ✓</span>
          ) : (
            <button
              type="button"
              onClick={favoritarHoje}
              disabled={fetching || salvandoHoje}
              className="rounded-lg bg-ember px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
            >
              {salvandoHoje ? "Salvando..." : "Favoritar"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por referência, texto ou anotação"
          className={CAMPO}
        />
        <button
          type="button"
          onClick={() => setFormAberto((v) => !v)}
          className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm text-bone hover:border-mute transition-colors"
        >
          {formAberto ? "Fechar" : "Adicionar versículo"}
        </button>
      </div>

      {formAberto && (
        <form
          onSubmit={adicionar}
          className="rounded-lg border border-line bg-panel p-5 flex flex-col gap-3"
        >
          <h2 className="text-xs tracking-wide text-mute uppercase">
            Novo versículo
          </h2>
          <input
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            maxLength={80}
            placeholder="Referência (ex.: Salmos 23:1)"
            className={CAMPO}
          />
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Texto do versículo"
            className={CAMPO}
          />
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            placeholder="Anotação (opcional)"
            className={CAMPO}
          />
          <div>
            <button
              type="submit"
              disabled={!referencia.trim() || !texto.trim() || salvando}
              className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
            >
              {salvando ? "Salvando..." : "Salvar versículo"}
            </button>
          </div>
        </form>
      )}

      {fetching ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="text-sm text-mute">
            {itens.length === 0
              ? "Nenhum versículo favorito ainda."
              : "Nenhum versículo encontrado nessa busca."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map((v) => (
            <div
              key={v.id}
              className="min-w-0 rounded-lg border border-line bg-panel p-5"
            >
              <p className="text-bone whitespace-pre-wrap break-words">
                {v.text}
              </p>
              <p className="text-xs text-ember mt-2">— {v.reference}</p>

              {editandoId === v.id ? (
                <div className="mt-3 pt-3 border-t border-line flex flex-col gap-3">
                  <textarea
                    value={notaEdit}
                    onChange={(e) => setNotaEdit(e.target.value)}
                    rows={3}
                    placeholder="Anotação"
                    className={CAMPO}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => salvarNota(v)}
                      className="rounded-lg bg-ember px-4 py-2 text-sm font-medium text-ink"
                    >
                      Salvar anotação
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoId(null)}
                      className="text-sm text-mute hover:text-bone"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                v.note && (
                  <p className="text-sm text-mute mt-3 whitespace-pre-wrap break-words">
                    {v.note}
                  </p>
                )
              )}

              <div className="flex items-center gap-4 mt-4 text-sm">
                {editandoId !== v.id && (
                  <button
                    type="button"
                    onClick={() => abrirEdicao(v)}
                    className="text-ember"
                  >
                    {v.note ? "Editar anotação" : "Adicionar anotação"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => apagar(v)}
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