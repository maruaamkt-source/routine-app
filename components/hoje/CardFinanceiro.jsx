"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pad = (n) => String(n).padStart(2, "0");
const mesISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;

function valorNoMes(f, hist, ref) {
  const hs = hist
    .filter((h) => h.fixed_expense_id === f.id && h.effective_from <= ref)
    .sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  return hs.length ? Number(hs[hs.length - 1].amount) : Number(f.amount);
}

// o gasto vence nesta data? (dia 31 em mês curto vale o último dia)
function venceEm(f, data) {
  const ultimo = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
  return Math.min(f.due_day, ultimo) === data.getDate();
}

export default function CardFinanceiro({ userId }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function carregar() {
      const hoje = new Date();
      const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
      const mesAtual = mesISO(hoje);
      const meses = [...new Set([mesAtual, mesISO(amanha)])];

      const [fx, pg, hs, ins, ipg] = await Promise.all([
        supabase
          .from("fixed_expenses")
          .select("id, name, amount, due_day, created_at")
          .eq("user_id", userId),
        supabase
          .from("fixed_payments")
          .select("fixed_expense_id, ref_month")
          .eq("user_id", userId)
          .in("ref_month", meses),
        supabase
          .from("fixed_expense_history")
          .select("fixed_expense_id, amount, effective_from")
          .eq("user_id", userId),
        supabase
          .from("installments")
          .select("id, installment_amount, total_installments, start_month")
          .eq("user_id", userId),
        supabase
          .from("installment_payments")
          .select("installment_id")
          .eq("user_id", userId)
          .eq("ref_month", mesAtual),
      ]);

      if (cancelado) return;
      if (fx.error || pg.error || ins.error || ipg.error) {
        setDados({ erro: true });
        return;
      }

      const fixos = fx.data || [];
      const hist = hs.error ? [] : hs.data || [];
      const pagos = new Set(
        (pg.data || []).map((p) => `${p.fixed_expense_id}|${p.ref_month}`)
      );
      const desde = (f) => mesISO(new Date(f.created_at));

      // falta pagar no mês: fixos não pagos + parcelas ativas não pagas
      let falta = 0;
      fixos
        .filter((f) => desde(f) <= mesAtual)
        .forEach((f) => {
          if (!pagos.has(`${f.id}|${mesAtual}`)) falta += valorNoMes(f, hist, mesAtual);
        });

      const idxMes = hoje.getFullYear() * 12 + hoje.getMonth();
      const parcPagas = new Set((ipg.data || []).map((p) => p.installment_id));
      (ins.data || []).forEach((p) => {
        const [sy, sm] = String(p.start_month).split("-").map(Number);
        const numero = idxMes - (sy * 12 + (sm - 1)) + 1;
        if (numero >= 1 && numero <= Number(p.total_installments) && !parcPagas.has(p.id)) {
          falta += Number(p.installment_amount);
        }
      });

      // vence hoje e amanhã (e ainda não pago)
      const vencem = [];
      [
        { data: hoje, rotulo: "hoje" },
        { data: amanha, rotulo: "amanhã" },
      ].forEach(({ data, rotulo }) => {
        const ref = mesISO(data);
        fixos
          .filter((f) => f.due_day && desde(f) <= ref && venceEm(f, data))
          .filter((f) => !pagos.has(`${f.id}|${ref}`))
          .forEach((f) =>
            vencem.push({
              chave: `${f.id}|${ref}`,
              nome: f.name,
              rotulo,
              valor: valorNoMes(f, hist, ref),
            })
          );
      });

      setDados({ falta, vencem });
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  return (
    <Link
      href="/financeiro"
      className="block min-w-0 rounded-lg border border-line bg-panel p-5 hover:border-ember"
    >
      <p className="mb-3 text-xs uppercase tracking-wide text-mute">Financeiro</p>
      {!dados ? (
        <p className="text-sm text-mute">Carregando...</p>
      ) : dados.erro ? (
        <p className="text-sm text-mute">Não consegui carregar.</p>
      ) : (
        <>
          <p className="font-serif text-2xl text-bone tabular-nums">
            {brl(dados.falta)}
          </p>
          <p className="mt-1 text-xs text-mute">falta pagar no mês</p>
          <div className="mt-3 border-t border-line pt-3">
            {dados.vencem.length === 0 ? (
              <p className="text-sm text-mute">Nada vence hoje nem amanhã.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {dados.vencem.map((v) => (
                  <li
                    key={v.chave}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-bone">
                      {v.nome} <span className="text-mute">{v.rotulo}</span>
                    </span>
                    <span className="shrink-0 text-bone tabular-nums">
                      {brl(v.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Link>
  );
}