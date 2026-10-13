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

// "out"
function nomeCurto(iso) {
  const { y, m } = parseMes(iso);
  return new Date(y, m, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
}

// Cores das fatias: só tokens do tema (as classes precisam estar escritas assim)
const CORES = [
  { stroke: "stroke-ember", bg: "bg-ember" },
  { stroke: "stroke-bone", bg: "bg-bone" },
  { stroke: "stroke-ember/60", bg: "bg-ember/60" },
  { stroke: "stroke-bone/60", bg: "bg-bone/60" },
  { stroke: "stroke-mute", bg: "bg-mute" },
  { stroke: "stroke-ember/35", bg: "bg-ember/35" },
  { stroke: "stroke-bone/35", bg: "bg-bone/35" },
];

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
  const [sel, setSel] = useState(null); // categoria escolhida (null = todas)

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
    () => r2(categorias.reduce((s, c) => s + c.total, 0)),
    [categorias]
  );

  // Se a categoria escolhida sumiu (ex.: gasto apagado), volta para "todas"
  const ativo = sel && categorias.some((c) => c.nome === sel) ? sel : null;

  // Fatias da rosca (circunferência = 100 unidades)
  const fatias = useMemo(() => {
    const folga = categorias.length > 1 ? 0.8 : 0;
    let acumulado = 0;
    return categorias.map((c, i) => {
      const pct = totalGeral > 0 ? (c.total / totalGeral) * 100 : 0;
      const fatia = {
        ...c,
        pct,
        len: Math.max(0, pct - folga),
        ini: acumulado + folga / 2,
        cor: CORES[i % CORES.length],
      };
      acumulado += pct;
      return fatia;
    });
  }, [categorias, totalGeral]);

  const fatiaAtiva = fatias.find((f) => f.nome === ativo) || null;
  const rotuloCentro = fatiaAtiva ? fatiaAtiva.nome : "12 meses";
  const valorCentro = fatiaAtiva ? fatiaAtiva.total : totalGeral;

  // As 12 colunas (do mais antigo para o atual) com o total do filtro
  const colunas = useMemo(() => {
    const mapa = {};
    gastos.forEach((g) => {
      if (ativo && g.categoria !== ativo) return;
      mapa[g.mes] = (mapa[g.mes] || 0) + g.valor;
    });
    return Array.from({ length: 12 }, (_, i) => {
      const mes = somarMes(inicio, i);
      return { mes, valor: r2(mapa[mes] || 0) };
    });
  }, [gastos, ativo, inicio]);

  const maximo = Math.max(1, ...colunas.map((c) => c.valor));
  const altura = (v) => (v > 0 ? `${Math.max(3, (v / maximo) * 100)}%` : "0%");

  const mesesComGasto = colunas.filter((c) => c.valor > 0);
  const totalFiltro = r2(colunas.reduce((s, c) => s + c.valor, 0));
  const media = mesesComGasto.length > 0 ? totalFiltro / mesesComGasto.length : 0;

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h2 className="text-xs tracking-wide text-mute uppercase mb-1">
        Gastos por categoria
      </h2>
      <p className="mb-4 text-xs text-mute">
        Gastos variáveis dos últimos 12 meses. Toque numa categoria para ver mês
        a mês.
      </p>

      {erro && <p className="mb-3 text-sm text-bone/90">{erro}</p>}

      {!lido && !erro && <p className="text-sm text-mute">Carregando...</p>}

      {lido && gastos.length === 0 && (
        <p className="text-sm text-mute">
          Nenhum gasto variável nos últimos 12 meses.
        </p>
      )}

      {lido && gastos.length > 0 && (
        <>
          <div className="relative mx-auto h-48 w-48">
            <svg
              viewBox="0 0 42 42"
              className="h-full w-full"
              role="img"
              aria-label={`Gastos por categoria nos últimos 12 meses, total de ${brl(
                totalGeral
              )}`}
            >
              <circle
                cx="21"
                cy="21"
                r="16"
                fill="none"
                strokeWidth="5"
                className="stroke-surface"
              />
              {fatias.map((f) => (
                <circle
                  key={f.nome}
                  cx="21"
                  cy="21"
                  r="16"
                  fill="none"
                  strokeWidth="5"
                  pathLength="100"
                  strokeDasharray={`${f.len} ${100 - f.len}`}
                  strokeDashoffset={-f.ini}
                  transform="rotate(-90 21 21)"
                  className={
                    f.cor.stroke +
                    " transition-opacity " +
                    (ativo && ativo !== f.nome ? "opacity-30" : "opacity-100")
                  }
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="max-w-[7rem] truncate text-xs text-mute">
                {rotuloCentro}
              </span>
              <span className="whitespace-nowrap font-serif text-lg text-bone tabular-nums">
                {brl(valorCentro)}
              </span>
              {fatiaAtiva && (
                <span className="text-xs text-mute">
                  {fatiaAtiva.pct.toFixed(0)}% do total
                </span>
              )}
            </div>
          </div>

          <ul className="mt-4 flex flex-col">
            {fatias.map((f) => (
              <li key={f.nome}>
                <button
                  onClick={() => setSel(ativo === f.nome ? null : f.nome)}
                  aria-pressed={ativo === f.nome}
                  className={
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left " +
                    (ativo === f.nome ? "bg-surface" : "hover:bg-surface")
                  }
                >
                  <span
                    className={"h-2.5 w-2.5 shrink-0 rounded-sm " + f.cor.bg}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-bone">
                    {f.nome}
                  </span>
                  <span className="shrink-0 text-sm text-bone tabular-nums">
                    {brl(f.total)}
                  </span>
                  <span className="w-9 shrink-0 text-right text-xs text-mute tabular-nums">
                    {f.pct.toFixed(0)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-xs text-mute">
              {ativo ? ativo : "Todas as categorias"}, mês a mês
            </p>
            <div className="flex gap-1">
              {colunas.map((c) => {
                const selecionado = c.mes === mesSel;
                const dica = `${rotuloLongo(c.mes)}: ${brl(c.valor)}`;
                return (
                  <button
                    key={c.mes}
                    onClick={() => onEscolherMes && onEscolherMes(c.mes)}
                    title={dica}
                    aria-label={dica}
                    className="flex min-w-0 flex-1 flex-col items-stretch gap-1"
                  >
                    <div className="flex h-16 items-end justify-center border-b border-line">
                      <div
                        className="w-full max-w-[1rem] rounded-t bg-ember"
                        style={{ height: altura(c.valor) }}
                      />
                    </div>
                    <span
                      className={
                        "text-center text-[10px] " +
                        (selecionado ? "text-ember" : "text-mute")
                      }
                    >
                      {nomeCurto(c.mes)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-mute">
              {mesesComGasto.length > 0
                ? `Média de ${brl(media)} nos meses com gasto.`
                : "Sem gasto nessa categoria nos últimos 12 meses."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}