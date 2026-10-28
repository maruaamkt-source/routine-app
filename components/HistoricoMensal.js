"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pad = (n) => String(n).padStart(2, "0");

// arredonda para 2 casas (evita diferença de ponto flutuante na comparação)
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

// banco -> tela
const fromClosing = (r) => ({
    guardado: Number(r.saved_total),
  dizimo: Number(r.tithe_total ?? 0),
  mes: r.ref_month, // "YYYY-MM-01"
  renda: Number(r.income),
  fixos: Number(r.fixed_total),
  parcelas: Number(r.installments_total),
  variaveis: Number(r.variable_total),
  guardado: Number(r.saved_total),
  dizimo: Number(r.tithe_total ?? 0),
});

const CAMPOS = ["renda", "fixos", "parcelas", "variaveis", "guardado", "dizimo"];

// Card "Histórico mensal": últimos 12 meses de entrou / gastou / guardou.
// - Mês atual: é salvo sozinho conforme os números mudam.
// - Mês passado: é salvo uma vez quando você abre o mês e depois fica fechado.
//   Se os números mudarem, aparece o botão "Atualizar fechamento".
// - Mês futuro: não salva nada.
export default function HistoricoMensal({
  userId,
  mesSel,
  pronto,
  renda,
  fixos,
  parcelas,
  variaveis,
  guardado,
  dizimo,
  onEscolherMes,
}) {
  const [linhas, setLinhas] = useState([]);
  const [lido, setLido] = useState(false);
  const [erro, setErro] = useState("");

  const hoje = mesAtualISO();
  const inicio = somarMes(hoje, -11);

  // Lê os fechamentos já salvos (últimos 12 meses)
  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function ler() {
      const { data, error } = await supabase
        .from("monthly_closings")
        .select("*")
        .eq("user_id", userId)
        .gte("ref_month", inicio)
        .lte("ref_month", hoje)
        .order("ref_month", { ascending: true });

      if (cancelado) return;
      if (error) {
        setErro(
          "Não foi possível carregar o histórico. Confira se a tabela monthly_closings foi criada."
        );
        return;
      }
      setLinhas((data ?? []).map(fromClosing));
      setErro("");
      setLido(true);
    }

    ler();
    return () => {
      cancelado = true;
    };
  }, [userId, inicio, hoje]);

  // Números do mês que está na tela
  const atual = useMemo(
    () => ({
      renda: r2(renda),
      fixos: r2(fixos),
      parcelas: r2(parcelas),
      variaveis: r2(variaveis),
      guardado: r2(guardado),
      dizimo: r2(dizimo),
    }),
    [renda, fixos, parcelas, variaveis, guardado, dizimo]
  );

  const linhaDoMes = linhas.find((l) => l.mes === mesSel) || null;
  const igual =
    !!linhaDoMes && CAMPOS.every((k) => r2(linhaDoMes[k]) === atual[k]);
  const tudoZero = CAMPOS.every((k) => atual[k] === 0);
  const ehPassado = mesSel < hoje;
  const ehFuturo = mesSel > hoje;

  const gravar = useCallback(
    async (mes, valores) => {
      const { data, error } = await supabase
        .from("monthly_closings")
        .upsert(
          {
            user_id: userId,
            ref_month: mes,
            income: valores.renda,
            fixed_total: valores.fixos,
            installments_total: valores.parcelas,
            variable_total: valores.variaveis,
            saved_total: valores.guardado,
            tithe_total: valores.dizimo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,ref_month" }
        )
        .select()
        .single();

      if (error) {
        setErro("Não foi possível salvar o fechamento do mês. Tente de novo.");
        return;
      }
      setErro("");
      const nova = fromClosing(data);
      setLinhas((l) =>
        [...l.filter((x) => x.mes !== nova.mes), nova].sort((a, b) =>
          a.mes < b.mes ? -1 : 1
        )
      );
    },
    [userId]
  );

  // Salva sozinho quando precisa
  useEffect(() => {
    if (!lido || !pronto || !userId) return;
    if (ehFuturo) return; // mês futuro: só consulta
    if (igual) return; // já está salvo igual
    if (!linhaDoMes && tudoZero) return; // não cria mês vazio
    if (ehPassado && linhaDoMes) return; // mês fechado: só pelo botão
    gravar(mesSel, atual);
  }, [
    lido,
    pronto,
    userId,
    mesSel,
    ehFuturo,
    ehPassado,
    igual,
    linhaDoMes,
    tudoZero,
    atual,
    gravar,
  ]);

  // As 12 colunas do gráfico (do mais antigo para o atual)
  const colunas = useMemo(() => {
    const mapa = {};
    linhas.forEach((l) => {
      mapa[l.mes] = l;
    });
    return Array.from({ length: 12 }, (_, i) => {
      const mes = somarMes(inicio, i);
      const l = mapa[mes] || null;
      const gasto = l ? l.fixos + l.parcelas + l.variaveis + l.dizimo : 0;
      const sobra = l ? l.renda - gasto - l.guardado : 0;
      return { mes, l, gasto, sobra };
    });
  }, [linhas, inicio]);

  const maximo = Math.max(
    1,
    ...colunas.flatMap((c) => (c.l ? [c.l.renda, c.gasto, c.l.guardado] : [0]))
  );

  const altura = (v) =>
    v > 0 ? `${Math.max(2, (v / maximo) * 100)}%` : "0%";

  const comRegistro = [...colunas].filter((c) => c.l).reverse();
  const mostrarAtualizar = ehPassado && !!linhaDoMes && !igual && pronto;

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h2 className="text-xs tracking-wide text-mute uppercase mb-1">
        Histórico mensal
      </h2>
      <p className="mb-4 text-xs text-mute">
        Últimos 12 meses. O mês atual é salvo sozinho. Um mês antigo entra aqui
        quando você abre ele pela primeira vez.
      </p>

      {erro && <p className="mb-3 text-sm text-bone/90">{erro}</p>}

      {mostrarAtualizar && (
        <div className="mb-4 rounded-lg border-l-2 border-ember bg-surface p-3">
          <p className="text-sm text-bone/90 leading-snug">
            Os números de {rotuloLongo(mesSel)} mudaram desde o fechamento.
          </p>
          <button
            onClick={() => gravar(mesSel, atual)}
            className="mt-2 rounded-lg border border-line px-4 py-2 text-xs text-bone hover:border-ember"
          >
            Atualizar fechamento
          </button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-mute/50" />
          Entrou
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-ember" />
          Gastou
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-bone" />
          Guardou
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[36rem] gap-1">
          {colunas.map((c, i) => {
            const { y, m } = parseMes(c.mes);
            const selecionado = c.mes === mesSel;
            const mostrarAno = i === 0 || m === 0;
            const dica = c.l
              ? `${rotuloLongo(c.mes)}: entrou ${brl(c.l.renda)}, gastou ${brl(
                  c.gasto
                )}, guardou ${brl(c.l.guardado)}`
              : `${rotuloLongo(c.mes)}: sem registro`;
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
                <div className="flex h-36 items-end justify-center gap-0.5 border-b border-line">
                  <div
                    className="w-2 rounded-t bg-mute/50 md:w-3"
                    style={{ height: altura(c.l ? c.l.renda : 0) }}
                  />
                  <div
                    className="w-2 rounded-t bg-ember md:w-3"
                    style={{ height: altura(c.gasto) }}
                  />
                  <div
                    className="w-2 rounded-t bg-bone md:w-3"
                    style={{ height: altura(c.l ? c.l.guardado : 0) }}
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

      {comRegistro.length === 0 ? (
        <p className="mt-4 text-sm text-mute">
          Ainda não há meses registrados. Lance sua renda e seus gastos e o mês
          atual aparece aqui.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {comRegistro.map((c) => (
            <li key={c.mes} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-bone">{rotuloCurto(c.mes)}</span>
                <span
                  className={
                    "text-sm tabular-nums " +
                    (c.sobra < 0 ? "text-ember" : "text-bone")
                  }
                >
                  <span className="text-xs text-mute">sobra </span>
                  {brl(c.sobra)}
                </span>
              </div>
              <p className="text-xs text-mute">
                Entrou {brl(c.l.renda)} · Gastou {brl(c.gasto)} · Guardou{" "}
                {brl(c.l.guardado)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}