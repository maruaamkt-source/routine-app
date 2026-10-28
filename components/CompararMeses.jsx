"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const pad = (n) => String(n).padStart(2, "0");
const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function somarMes(iso, delta) {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function rotulo(iso) {
  const [y, m] = iso.split("-").map(Number);
  const t = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function limites(iso) {
  const [y, m] = iso.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return { ini: `${y}-${pad(m)}-01`, fim: `${y}-${pad(m)}-${pad(ultimo)}` };
}

async function totaisPorCategoria(userId, mes) {
  const { ini, fim } = limites(mes);
  const { data, error } = await supabase
    .from("variable_expenses")
    .select("category, amount")
    .eq("user_id", userId)
    .gte("spent_at", ini)
    .lte("spent_at", fim);
  if (error) return null;
  const out = {};
  (data ?? []).forEach((r) => {
    out[r.category] = (out[r.category] || 0) + Number(r.amount);
  });
  return out;
}

export default function CompararMeses({ userId, mesSel, pronto }) {
  const [mesA, setMesA] = useState(somarMes(mesSel, -1));
  const [mesB, setMesB] = useState(mesSel);
  const [a, setA] = useState({});
  const [b, setB] = useState({});
  const [falhou, setFalhou] = useState(false);

  // acompanha o mês da tela
  useEffect(() => {
    setMesA(somarMes(mesSel, -1));
    setMesB(mesSel);
  }, [mesSel]);

  useEffect(() => {
    if (!pronto) return;
    let vivo = true;
    Promise.all([
      totaisPorCategoria(userId, mesA),
      totaisPorCategoria(userId, mesB),
    ]).then(([ra, rb]) => {
      if (!vivo) return;
      if (!ra || !rb) {
        setFalhou(true);
        return;
      }
      setFalhou(false);
      setA(ra);
      setB(rb);
    });
    return () => {
      vivo = false;
    };
  }, [userId, mesA, mesB, pronto]);

  const opcoes = useMemo(
    () => Array.from({ length: 18 }, (_, i) => somarMes(mesSel, -i)),
    [mesSel]
  );

  const linhas = useMemo(() => {
    const cats = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...cats]
      .map((c) => {
        const va = a[c] || 0;
        const vb = b[c] || 0;
        return {
          c,
          va,
          vb,
          dif: vb - va,
          pct: va > 0 ? ((vb - va) / va) * 100 : null,
        };
      })
      .sort((x, y) => Math.abs(y.dif) - Math.abs(x.dif));
  }, [a, b]);

  const totA = Object.values(a).reduce((s, n) => s + n, 0);
  const totB = Object.values(b).reduce((s, n) => s + n, 0);

  const sel =
    "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone outline-none focus:border-ember";

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h2 className="text-xs tracking-wide text-mute uppercase mb-3">
        Comparar meses (variáveis por categoria)
      </h2>
      <div className="flex gap-2">
        <select
          className={sel + " min-w-0 flex-1"}
          value={mesA}
          onChange={(e) => setMesA(e.target.value)}
          aria-label="Primeiro mês"
        >
          {opcoes.map((m) => (
            <option key={m} value={m}>
              {rotulo(m)}
            </option>
          ))}
        </select>
        <span className="self-center text-mute">×</span>
        <select
          className={sel + " min-w-0 flex-1"}
          value={mesB}
          onChange={(e) => setMesB(e.target.value)}
          aria-label="Segundo mês"
        >
          {opcoes.map((m) => (
            <option key={m} value={m}>
              {rotulo(m)}
            </option>
          ))}
        </select>
      </div>

      {falhou ? (
        <p className="mt-3 text-sm text-mute">
          Não foi possível carregar a comparação.
        </p>
      ) : linhas.length === 0 ? (
        <p className="mt-3 text-sm text-mute">
          Sem gastos variáveis nesses meses.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {linhas.map((l) => (
            <li key={l.c} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-bone">{l.c}</span>
                <span
                  className={
                    "text-xs tabular-nums " +
                    (l.dif > 0 ? "text-ember" : "text-mute")
                  }
                >
                  {l.dif > 0 ? "+" : ""}
                  {brl(l.dif)}
                  {l.pct !== null
                    ? ` (${l.pct > 0 ? "+" : ""}${l.pct.toFixed(0)}%)`
                    : " (novo)"}
                </span>
              </div>
              <p className="text-xs text-mute tabular-nums">
                {rotulo(mesA)}: {brl(l.va)} · {rotulo(mesB)}: {brl(l.vb)}
              </p>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-3 pt-3">
            <span className="text-sm text-bone">Total</span>
            <span className="text-xs text-mute tabular-nums">
              {brl(totA)} → {brl(totB)} ({totB - totA > 0 ? "+" : ""}
              {brl(totB - totA)})
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}