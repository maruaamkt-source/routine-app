"use client";

import { useMemo } from "react";

const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const idx = (iso) => {
  const [y, m] = String(iso).split("-").map(Number);
  return y * 12 + (m - 1);
};

const rotulo = (i) => {
  const y = Math.floor(i / 12);
  const m = i % 12;
  const t = new Date(y, m, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default function LinhaTempoParcelas({ parcelas, mesSel }) {
  const meses = useMemo(() => {
    const ini = idx(mesSel);
    let fim = ini;
    parcelas.forEach((p) => {
      fim = Math.max(fim, idx(p.inicio) + p.total - 1);
    });
    fim = Math.min(fim, ini + 35); // no máximo 36 meses à frente

    const lista = [];
    for (let i = ini; i <= fim; i++) {
      const ativas = parcelas.filter(
        (p) => i >= idx(p.inicio) && i <= idx(p.inicio) + p.total - 1
      );
      lista.push({
        i,
        total: ativas.reduce((s, p) => s + p.valor, 0),
        qtd: ativas.length,
        nomes: ativas.map((p) => p.nome).join(", "),
      });
    }
    return lista;
  }, [parcelas, mesSel]);

  const max = Math.max(1, ...meses.map((m) => m.total));
  const temAlgo = meses.some((m) => m.total > 0);

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h2 className="text-xs tracking-wide text-mute uppercase mb-3">
        Linha do tempo das parcelas
      </h2>
      {!temAlgo ? (
        <p className="text-sm text-mute">Nenhuma parcela daqui pra frente.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {meses.map((m) => (
            <li key={m.i} title={m.nomes}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-mute">
                  {rotulo(m.i)} · {m.qtd} {m.qtd === 1 ? "parcela" : "parcelas"}
                </span>
                <span className="text-xs text-bone tabular-nums">
                  {brl(m.total)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-ember"
                  style={{ width: `${(m.total / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-mute">
        Total comprometido com parcelas em cada mês, a partir do mês que você
        está vendo. Veja como o valor cai quando cada compra quita.
      </p>
    </div>
  );
}