"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";
import {
  capitulosDoPlano,
  leituraDoDia,
  diasEntre,
  formatarData,
} from "@/lib/biblia";
import NovoPlano from "@/components/espiritual/NovoPlano";

export default function PlanoLeitura({ user }) {
  const [planos, setPlanos] = useState([]);
  const [feitos, setFeitos] = useState([]);
  const [contagens, setContagens] = useState({});
  const [fetching, setFetching] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelado = false;

    async function carregar() {
      const { data: lista, error } = await supabase
        .from("reading_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelado) return;
      if (error) {
        setErro(
          "Não consegui carregar o plano de leitura. Confira se o SQL das tabelas reading_plans e reading_progress foi rodado."
        );
        setFalhou(true);
        setFetching(false);
        return;
      }

      const todos = lista ?? [];
      setPlanos(todos);

      const ativoAtual = todos.find((p) => p.active);
      if (ativoAtual) {
        const { data: prog, error: erroProg } = await supabase
          .from("reading_progress")
          .select("day_number")
          .eq("plan_id", ativoAtual.id)
          .eq("user_id", user.id);
        if (cancelado) return;
        if (erroProg) {
          setErro("Não consegui carregar o seu progresso. Tenta de novo.");
          setFalhou(true);
          setFetching(false);
          return;
        }
        setFeitos((prog ?? []).map((r) => r.day_number));
      }

      setFetching(false);

      const antigosRecentes = todos.filter((p) => !p.active).slice(0, 5);
      const pares = await Promise.all(
        antigosRecentes.map(async (p) => {
          const { count } = await supabase
            .from("reading_progress")
            .select("id", { count: "exact", head: true })
            .eq("plan_id", p.id)
            .eq("user_id", user.id);
          return [p.id, count ?? 0];
        })
      );
      if (cancelado) return;
      setContagens(Object.fromEntries(pares));
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [user]);

  const ativo = planos.find((p) => p.active) ?? null;
  const antigos = planos.filter((p) => !p.active).slice(0, 5);

  const lista = useMemo(
    () => (ativo ? capitulosDoPlano(ativo.books) : []),
    [ativo]
  );

  // ---------- Contas do plano ativo ----------
  const feitosSet = new Set(feitos);

  let proximo = null;
  if (ativo) {
    for (let d = 1; d <= ativo.total_days; d++) {
      if (!feitosSet.has(d)) {
        proximo = d;
        break;
      }
    }
  }

  const proximosDias = [];
  if (ativo && proximo !== null) {
    for (
      let d = proximo + 1;
      d <= ativo.total_days && proximosDias.length < 5;
      d++
    ) {
      if (!feitosSet.has(d)) proximosDias.push(d);
    }
  }

  const lidos = feitosSet.size;
  const pct = ativo ? Math.round((lidos / ativo.total_days) * 100) : 0;

  let ritmoMsg = "";
  if (ativo && proximo !== null) {
    const passados = Math.min(
      ativo.total_days,
      Math.max(0, diasEntre(ativo.start_date, todayISO()))
    );
    const atraso = passados - lidos;
    const adiantado = lidos - (passados + 1);
    if (atraso > 0) {
      ritmoMsg = `Você está ${atraso} ${
        atraso === 1 ? "dia" : "dias"
      } atrás do ritmo. Sem problema: é só continuar de onde parou.`;
    } else if (adiantado > 0) {
      ritmoMsg = `Você está ${adiantado} ${
        adiantado === 1 ? "dia" : "dias"
      } à frente do ritmo.`;
    } else {
      ritmoMsg = "Você está no ritmo.";
    }
  }

  // ---------- Ações ----------
  async function iniciarPlano({ nome, books, totalDias }) {
    if (salvando) return;
    setErro("");
    setSalvando(true);
    const { data, error } = await supabase
      .from("reading_plans")
      .insert({
        user_id: user.id,
        name: nome,
        books,
        total_days: totalDias,
        start_date: todayISO(),
        active: true,
      })
      .select()
      .single();
    setSalvando(false);
    if (error) {
      setErro("Não consegui criar o plano. Tenta de novo.");
      return;
    }
    setPlanos((prev) => [data, ...prev]);
    setFeitos([]);
  }

  async function marcarLido() {
    if (!ativo || proximo === null || salvando) return;
    setErro("");
    setSalvando(true);
    const dia = proximo;
    const { error } = await supabase.from("reading_progress").insert({
      user_id: user.id,
      plan_id: ativo.id,
      day_number: dia,
      done_at: todayISO(),
    });
    setSalvando(false);
    // 23505 = esse dia já estava marcado (por exemplo em outro aparelho)
    if (error && error.code !== "23505") {
      setErro("Não consegui marcar a leitura. Tenta de novo.");
      return;
    }
    setFeitos((prev) => (prev.includes(dia) ? prev : [...prev, dia]));
  }

  async function desfazer() {
    if (!ativo || feitos.length === 0 || salvando) return;
    setErro("");
    const ultimo = Math.max(...feitos);
    const { error } = await supabase
      .from("reading_progress")
      .delete()
      .eq("plan_id", ativo.id)
      .eq("day_number", ultimo)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui desfazer. Tenta de novo.");
      return;
    }
    setFeitos((prev) => prev.filter((d) => d !== ultimo));
  }

  async function encerrar() {
    if (!ativo) return;
    if (
      !window.confirm(
        "Encerrar este plano? O progresso fica guardado em Planos anteriores."
      )
    ) {
      return;
    }
    setErro("");
    const idEncerrado = ativo.id;
    const { error } = await supabase
      .from("reading_plans")
      .update({ active: false })
      .eq("id", idEncerrado)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui encerrar o plano. Tenta de novo.");
      return;
    }
    setPlanos((prev) =>
      prev.map((p) => (p.id === idEncerrado ? { ...p, active: false } : p))
    );
    setContagens((prev) => ({ ...prev, [idEncerrado]: feitos.length }));
    setFeitos([]);
  }

  async function apagarPlano(plano) {
    if (!window.confirm("Apagar este plano e o progresso dele?")) return;
    setErro("");
    const { error } = await supabase
      .from("reading_plans")
      .delete()
      .eq("id", plano.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui apagar o plano. Tenta de novo.");
      return;
    }
    setPlanos((prev) => prev.filter((p) => p.id !== plano.id));
  }

  // ---------- Tela ----------
  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
          <p className="text-sm text-bone">{erro}</p>
        </div>
      )}

      {fetching && <p className="text-sm text-mute">Carregando...</p>}

      {!fetching && !falhou && !ativo && (
        <NovoPlano onIniciar={iniciarPlano} salvando={salvando} />
      )}

      {!fetching && !falhou && ativo && (
        <>
          <div className="min-w-0 rounded-lg border border-line bg-panel p-5 flex flex-col gap-3">
            <h2 className="text-xs tracking-wide text-mute uppercase break-words">
              {ativo.name}
            </h2>

            {proximo === null ? (
              <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
                <p className="text-bone">Plano concluído! 🎉</p>
                <p className="text-sm text-mute mt-1">
                  Você leu todos os {ativo.total_days} dias do plano.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-ember">
                  Leitura de hoje · Dia {proximo} de {ativo.total_days}
                </p>
                <p className="font-serif text-2xl text-bone break-words">
                  {leituraDoDia(lista, ativo.total_days, proximo)}
                </p>
                <div>
                  <button
                    type="button"
                    onClick={marcarLido}
                    disabled={salvando}
                    className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
                  >
                    {salvando ? "Salvando..." : "Marcar como lida"}
                  </button>
                </div>
              </>
            )}

            <div className="mt-1">
              <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-ember"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-mute mt-2">
                {lidos} de {ativo.total_days} dias lidos ({pct}%) · início em{" "}
                {formatarData(ativo.start_date)}
              </p>
              {ritmoMsg && <p className="text-xs text-mute mt-1">{ritmoMsg}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
              {feitos.length > 0 && (
                <button
                  type="button"
                  onClick={desfazer}
                  className="text-mute hover:text-bone"
                >
                  Desfazer última leitura
                </button>
              )}
              <button
                type="button"
                onClick={encerrar}
                className="text-mute hover:text-bone"
              >
                Encerrar plano
              </button>
            </div>
          </div>

          {proximosDias.length > 0 && (
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-3">
                Próximos dias
              </h2>
              <ul className="flex flex-col gap-2">
                {proximosDias.map((d) => (
                  <li
                    key={d}
                    className="text-sm flex justify-between gap-3 min-w-0"
                  >
                    <span className="text-mute shrink-0">Dia {d}</span>
                    <span className="text-bone text-right break-words min-w-0">
                      {leituraDoDia(lista, ativo.total_days, d)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {!fetching && !falhou && antigos.length > 0 && (
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xs tracking-wide text-mute uppercase mb-3">
            Planos anteriores
          </h2>
          <ul className="flex flex-col gap-3">
            {antigos.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-sm text-bone break-words">{p.name}</p>
                  <p className="text-xs text-mute">
                    Início em {formatarData(p.start_date)}
                    {contagens[p.id] !== undefined &&
                      ` · ${contagens[p.id]} de ${p.total_days} dias lidos`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => apagarPlano(p)}
                  className="text-sm text-mute hover:text-bone shrink-0"
                >
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}