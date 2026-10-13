"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pad = (n) => String(n).padStart(2, "0");

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

// "2026-10-01": primeiro dia do mês atual
function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

// "2026-10-01" -> { y: 2026, m: 9 } (m começa em 0, como no Date)
function parseMes(iso) {
  const [y, m] = String(iso).split("-").map(Number);
  return { y, m: m - 1 };
}

// soma (ou subtrai) meses de um "YYYY-MM-01"
function somarMes(iso, delta) {
  const { y, m } = parseMes(iso);
  const d = new Date(y, m + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

// último dia do mês: "2026-10-31"
function ultimoDia(iso) {
  const { y, m } = parseMes(iso);
  return `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
}

const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// "Outubro de 2026"
function rotuloLongo(iso) {
  const { y, m } = parseMes(iso);
  return maiuscula(
    new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  );
}

// "Out/2026"
function rotuloCurto(iso) {
  const { y, m } = parseMes(iso);
  const mes = new Date(y, m, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `${maiuscula(mes)}/${y}`;
}

// "out"
function nomeCurto(iso) {
  const { y, m } = parseMes(iso);
  return new Date(y, m, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
}

// Card "Gastos por categoria": gastos variáveis dos últimos 12 meses.
// Lê direto de variable_expenses, então não precisa de tabela nova.
export default function GastosPorCategoria({
  userId,
  mesSel,
  pronto,
  atualizar,
  onEscolherMes,
}) {
  const [gastos, setGastos] = useState([]); // { mes, categoria, valor }
  const [lido, setLido] = useState(false);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("Todas");

  const hoje = mesAtualISO();
  const inicio = somarMes(hoje, -11);
  const fim = ultimoDia(hoje);

  // Lê os gastos variáveis dos últimos 12 meses (de 1000 em 1000)
  useEffect(() => {
    if (!userId || !pronto) return;
    let cancelado = false;

    async function ler() {
      let todas = [];
      let de = 0;

      while (true) {
        const { data, error } = await supabase
          .from("variable_expenses")
          .select("category, amount, spent_at")
          .eq("user_id", userId)
          .gte("spent_at", inicio)
          .lte("spent_at", fim)
          .order("spent_at", { ascending: true })
          .order("id", { ascending: true })
          .range(de, de + 999);

        if (cancelado) return;
        if (error) {
          setErro("Não foi possível carregar os gastos por categoria.");
          return;
        }
        const lote = data ?? [];
        todas = todas.concat(lote);
        if (lote.length < 1000) break;
        de += 1000;
      }

      setGastos(
        todas.map((r) => ({
          mes: `${String(r.spent_at).slice(0, 7)}-01`,
          categoria: r.category,
          valor: Number(r.amount),
        }))
      );
      setErro("");
      setLido(true);
    }

    ler();
    return () => {
      cancelado = true;
    };
  }, [userId, pronto, atualizar, inicio, fim]);

  // Categorias com gasto nos 12 meses, da maior para a menor
  const categorias = useMemo(() => {
    const t = {};
    gastos.forEach((g) => {
      t[g.categoria] = (t[g.categoria] || 0) + g.valor;
    });
    return Object.entries(t)
      .map(([nome, total]) => ({ nome, total: r2(total) }))
      .sort((a, b) => b.total - a.total);
  }, [gastos]);

  const totalGeral = useMemo(
    () => categorias.reduce((s, c) => s + c.total, 0),
    [categorias]
  );

  // Se a categoria escolhida sumiu (ex.: gasto apagado), volta para "Todas"
  const ativo =
    filtro === "Todas" || categorias.some((c) => c.nome === filtro)
      ? filtro
      : "Todas";

  // As 12 colunas (do mais antigo para o atual) com o total do filtro
  const colunas = useMemo(() => {
    const mapa = {};
    gastos.forEach((g) => {
      if (ativo !== "Todas" && g.categoria !== ativo) return;
      mapa[g.mes] = (mapa[g.mes] || 0) + g.valor;
    });
    return Array.from({ length: 12 }, (_, i) => {
      const mes = somarMes(inicio, i);
      return { mes, valor: r2(mapa[mes] || 0) };
    });
  }, [gastos, ativo, inicio]);

  const maximo = Math.max(1, ...colunas.map((c) => c.valor));
  const altura = (v) => (v > 0 ? `${Math.max(2, (v / maximo) * 100)}%` : "0%");

  const mesesComGasto = colunas.filter((c) => c.valor > 0);
  const totalSel = r2(colunas.reduce((s, c) => s + c.valor, 0));
  const media = mesesComGasto.length > 0 ? totalSel / mesesComGasto.length : 0;

  const opcoes = ["Todas", ...categorias.map((c) => c.nome)];

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h2 className="text-xs tracking-wide text-mute uppercase mb-1">
        Gastos por categoria
      </h2>
      <p className="mb-4 text-xs text-mute">
        Gastos variáveis dos últimos 12 meses.
      </p>

      {erro && <p className="mb-3 text-sm text-bone/90">{erro}</p>}

      {lido && gastos.length === 0 ? (
        <p className="text-sm text-mute">
          Nenhum gasto variável nos últimos 12 meses.
        </p>
      ) : (
        <>
          {categorias.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {opcoes.map((nome) => (
                <button
                  key={nome}
                  onClick={() => setFiltro(nome)}
                  aria-pressed={ativo === nome}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs " +
                    (ativo === nome
                      ? "border-ember bg-ember text-ink"
                      : "border-line text-mute hover:text-bone")
                  }
                >
                  {nome}
                </button>
              ))}
            </div>
          )}

          <p className="mb-3 text-sm text-bone/90">
            <strong className="text-bone tabular-nums">{brl(totalSel)}</strong>{" "}
            em 12 meses
            {mesesComGasto.length > 0 && (
              <>
                {" "}
                · média de{" "}
                <span className="text-bone tabular-nums">{brl(media)}</span> nos
                meses com gasto
              </>
            )}
          </p>

          <div className="overflow-x-auto">
            <div className="flex min-w-[36rem] gap-1">
              {colunas.map((c, i) => {
                const { y, m } = parseMes(c.mes);
                const selecionado = c.mes === mesSel;
                const mostrarAno = i === 0 || m === 0;
                const dica = `${rotuloLongo(c.mes)}: ${brl(c.valor)}`;
                return (
                  <button
                    key={c.mes}
                    onClick={() => onEscolherMes && onEscolherMes(c.mes)}
                    title={dica}
                    aria-label={dica}
                    className={
                      "flex min-w-0 flex-1 flex-col items-stretch gap-1.5 rounded-lg px-0.5 py-1 " +
                      (selecionado ? "bg-surface" : "")
                    }
                  >
                    <div className="flex h-36 items-end justify-center border-b border-line">
                      <div
                        className="w-3 rounded-t bg-ember md:w-5"
                        style={{ height: altura(c.valor) }}
                      />
                    </div>
                    <span
                      className={
                        "text-center text-xs " +
                        (selecionado ? "text-ember" : "text-mute")
                      }
                    >
                      {nomeCurto(c.mes)}
                    </span>
                    <span className="h-3 text-center text-[10px] text-mute">
                      {mostrarAno ? y : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {ativo === "Todas" ? (
            categorias.length > 0 && (
              <ul className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
                {categorias.map((c) => {
                  const pct = totalGeral > 0 ? (c.total / totalGeral) * 100 : 0;
                  return (
                    <li key={c.nome}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-sm text-bone">
                          {c.nome}
                        </span>
                        <span className="shrink-0 text-sm text-bone tabular-nums">
                          {brl(c.total)}{" "}
                          <span className="text-xs text-mute">
                            {pct.toFixed(0)}%
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-ember transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {[...mesesComGasto].reverse().map((c) => (
                <li
                  key={c.mes}
                  className="flex items-baseline justify-between gap-3 py-2.5"
                >
                  <span className="text-sm text-bone">{rotuloCurto(c.mes)}</span>
                  <span className="text-sm text-bone tabular-nums">
                    {brl(c.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}