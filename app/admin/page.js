"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";

const ROTULO = { pendente: "Pendente", aprovado: "Aprovado", negado: "Negado" };

function dataCurta(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const userId = user ? user.id : null;

  const [admin, setAdmin] = useState(null);
  const [lista, setLista] = useState([]);
  const [filtro, setFiltro] = useState("pendente");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState("");

  const carregar = useCallback(async () => {
    if (!userId) return;
    const ad = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!ad.data) {
      setAdmin(false);
      return;
    }
    setAdmin(true);
    const { data, error } = await supabase
      .from("acessos")
      .select("user_id, email, name, codigo, status, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setErro("Não consegui carregar os pedidos: " + error.message);
      return;
    }
    setErro("");
    setLista(data || []);
  }, [userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function decidir(item, status) {
    if (salvando) return;
    setSalvando(item.user_id);
    const { error } = await supabase
      .from("acessos")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("user_id", item.user_id);
    setSalvando("");
    if (error) {
      setErro("Não consegui salvar: " + error.message);
      return;
    }
    setErro("");
    setLista((prev) =>
      prev.map((x) => (x.user_id === item.user_id ? { ...x, status } : x))
    );
  }

  if (loading || !user) return null;

  const dataPorExtenso = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const contagem = (s) => lista.filter((x) => x.status === s).length;
  const visiveis = lista.filter((x) => x.status === filtro);

  return (
    <div className="md:flex">
      <Nav />
      <main className="min-w-0 flex-1 px-6 py-10 pb-14 md:px-12 md:py-14">
        <p className="mb-1 text-sm uppercase tracking-wide text-ember">
          {dataPorExtenso}
        </p>
        <h1 className="mb-1 font-serif text-3xl text-bone md:text-4xl">Admin</h1>
        <p className="text-sm text-mute">Quem pediu acesso ao app</p>

        <div className="mt-8 max-w-3xl">
          {admin === null ? (
            <p className="text-sm text-mute">Carregando...</p>
          ) : admin === false ? (
            <div className="rounded-lg border-l-2 border-ember bg-panel p-4 text-sm text-bone">
              Sem permissão.
            </div>
          ) : (
            <>
              {erro && (
                <div className="mb-5 rounded-lg border-l-2 border-ember bg-panel p-4 text-sm text-bone">
                  {erro}
                </div>
              )}

              <div className="mb-5 flex flex-wrap gap-2">
                {["pendente", "aprovado", "negado"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFiltro(s)}
                    className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                      filtro === s
                        ? "border-ember/60 bg-emberSoft text-bone"
                        : "border-line text-mute hover:text-bone"
                    }`}
                  >
                    {ROTULO[s]} ({contagem(s)})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={carregar}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-mute hover:text-bone"
                >
                  Atualizar
                </button>
              </div>

              {visiveis.length === 0 ? (
                <div className="rounded-lg border border-line bg-panel p-5">
                  <p className="text-sm text-mute">
                    Nenhum pedido {ROTULO[filtro].toLowerCase()}.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {visiveis.map((x) => (
                    <li
                      key={x.user_id}
                      className="min-w-0 rounded-lg border border-line bg-panel p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-bone">
                            {x.name || "Sem nome"}
                          </p>
                          <p className="truncate text-sm text-mute">{x.email}</p>
                          <p className="mt-1 text-xs text-mute">
                            Pedido em {dataCurta(x.created_at)}
                          </p>
                        </div>
                        <p className="font-serif text-2xl tracking-widest text-ember">
                          {x.codigo}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        {x.status !== "aprovado" && (
                          <button
                            type="button"
                            onClick={() => decidir(x, "aprovado")}
                            disabled={salvando === x.user_id}
                            className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
                          >
                            Aprovar
                          </button>
                        )}
                        {x.status !== "negado" && (
                          <button
                            type="button"
                            onClick={() => decidir(x, "negado")}
                            disabled={salvando === x.user_id}
                            className="rounded-lg border border-line px-5 py-2.5 text-sm text-mute hover:text-bone disabled:opacity-40"
                          >
                            {x.status === "aprovado" ? "Revogar" : "Negar"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}