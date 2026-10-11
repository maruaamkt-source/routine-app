"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";

const CATEGORIAS = [
  "Mercado",
  "Alimentação",
  "Transporte",
  "Lazer",
  "Saúde",
  "Compras",
  "Outros",
];

const brl = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// aceita "1.500,50" ou "1500.50"
const toNumber = (v) => {
  const s = String(v).trim();
  if (!s) return 0;
  const clean = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};

const pad = (n) => String(n).padStart(2, "0");

// "2026-10-11" no fuso local (evita erro de fuso do toISOString)
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function limitesDoMes() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const ultimo = new Date(y, m + 1, 0).getDate();
  return {
    ini: `${y}-${pad(m + 1)}-01`,
    fim: `${y}-${pad(m + 1)}-${pad(ultimo)}`,
  };
}

// "2026-10-11" -> "11/10"
function dataCurta(iso) {
  const [, m, d] = String(iso).split("-");
  return `${d}/${m}`;
}

// banco -> tela
const fromIncome = (r) => ({ id: r.id, nome: r.name, valor: Number(r.amount) });
const fromFixed = (r) => ({
  id: r.id,
  nome: r.name,
  valor: Number(r.amount),
  dia: r.due_day,
});
const fromVar = (r) => {
  const desc = (r.description || "").trim();
  const data = dataCurta(r.spent_at);
  return {
    id: r.id,
    nome: desc || r.category,
    sub: desc ? `${r.category} · ${data}` : data,
    valor: Number(r.amount),
  };
};

function diasRestantesNoMes() {
  const hoje = new Date();
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  return ultimo - hoje.getDate() + 1; // conta o dia de hoje
}

function Campo({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={
        "rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-bone outline-none placeholder:text-mute focus:border-ember " +
        className
      }
    />
  );
}

function Seletor({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={
        "rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-bone outline-none focus:border-ember " +
        className
      }
    >
      {children}
    </select>
  );
}

function Lista({ itens, onRemover, vazio }) {
  if (itens.length === 0) {
    return <p className="text-sm text-mute py-2">{vazio}</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {itens.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-bone">{i.nome}</p>
            {i.sub ? <p className="text-xs text-mute">{i.sub}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm text-bone tabular-nums">{brl(i.valor)}</span>
            <button
              onClick={() => onRemover(i.id)}
              className="px-1 py-1 text-xs text-mute hover:text-ember"
              aria-label={`Remover ${i.nome}`}
            >
              remover
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function FinanceiroPage() {
  const { user, loading } = useAuth();
  const [rendas, setRendas] = useState([]);
  const [fixos, setFixos] = useState([]);
  const [variaveis, setVariaveis] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");

  const [rNome, setRNome] = useState("");
  const [rValor, setRValor] = useState("");
  const [fNome, setFNome] = useState("");
  const [fValor, setFValor] = useState("");
  const [fDia, setFDia] = useState("");
  const [vDesc, setVDesc] = useState("");
  const [vCat, setVCat] = useState(CATEGORIAS[0]);
  const [vValor, setVValor] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;

    const { ini, fim } = limitesDoMes();

    const [inc, fix, vars] = await Promise.all([
      supabase
        .from("income")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("fixed_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("variable_expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("spent_at", ini)
        .lte("spent_at", fim)
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (inc.error || fix.error || vars.error) {
      setErro(
        "Não foi possível carregar seus dados. Confira se as tabelas foram criadas."
      );
      setCarregado(true);
      return;
    }

    let rendasDb = (inc.data ?? []).map(fromIncome);
    let fixosDb = (fix.data ?? []).map(fromFixed);
    const varsDb = (vars.data ?? []).map(fromVar);

    // Migração única: se o banco está vazio e existe algo salvo no aparelho
    // pela primeira versão, envia para o Supabase e limpa o local.
    if (rendasDb.length === 0 && fixosDb.length === 0) {
      try {
        const chave = `routine:financeiro:${user.id}`;
        const antigo = JSON.parse(localStorage.getItem(chave) || "null");
        const rendasAntigas = antigo?.rendas ?? [];
        const fixosAntigos = antigo?.fixos ?? [];

        if (rendasAntigas.length || fixosAntigos.length) {
          let ok = true;

          if (rendasAntigas.length) {
            const { data, error } = await supabase
              .from("income")
              .insert(
                rendasAntigas.map((r) => ({
                  user_id: user.id,
                  name: r.nome,
                  amount: r.valor,
                }))
              )
              .select();
            if (error) ok = false;
            else rendasDb = (data ?? []).map(fromIncome);
          }

          if (fixosAntigos.length) {
            const { data, error } = await supabase
              .from("fixed_expenses")
              .insert(
                fixosAntigos.map((f) => ({
                  user_id: user.id,
                  name: f.nome,
                  amount: f.valor,
                  due_day: f.dia ?? null,
                }))
              )
              .select();
            if (error) ok = false;
            else fixosDb = (data ?? []).map(fromFixed);
          }

          if (ok) localStorage.removeItem(chave);
        }
      } catch {}
    }

    setRendas(rendasDb);
    setFixos(fixosDb);
    setVariaveis(varsDb);
    setErro("");
    setCarregado(true);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRenda = useMemo(() => rendas.reduce((s, i) => s + i.valor, 0), [rendas]);
  const totalFixos = useMemo(() => fixos.reduce((s, i) => s + i.valor, 0), [fixos]);
  const totalVariaveis = useMemo(
    () => variaveis.reduce((s, i) => s + i.valor, 0),
    [variaveis]
  );

  async function addRenda() {
    const valor = toNumber(rValor);
    if (!rNome.trim() || valor <= 0) return;
    const { data, error } = await supabase
      .from("income")
      .insert({ user_id: user.id, name: rNome.trim(), amount: valor })
      .select()
      .single();
    if (error) {
      setErro("Não foi possível salvar a renda. Tente de novo.");
      return;
    }
    setErro("");
    setRendas((l) => [...l, fromIncome(data)]);
    setRNome("");
    setRValor("");
  }

  async function removeRenda(id) {
    const { error } = await supabase.from("income").delete().eq("id", id);
    if (error) {
      setErro("Não foi possível remover. Tente de novo.");
      return;
    }
    setRendas((l) => l.filter((i) => i.id !== id));
  }

  async function addFixo() {
    const valor = toNumber(fValor);
    if (!fNome.trim() || valor <= 0) return;
    const dia = Math.min(31, Math.max(1, parseInt(fDia, 10) || 0)) || null;
    const { data, error } = await supabase
      .from("fixed_expenses")
      .insert({
        user_id: user.id,
        name: fNome.trim(),
        amount: valor,
        due_day: dia,
      })
      .select()
      .single();
    if (error) {
      setErro("Não foi possível salvar o gasto. Tente de novo.");
      return;
    }
    setErro("");
    setFixos((l) => [...l, fromFixed(data)]);
    setFNome("");
    setFValor("");
    setFDia("");
  }

  async function removeFixo(id) {
    const { error } = await supabase.from("fixed_expenses").delete().eq("id", id);
    if (error) {
      setErro("Não foi possível remover. Tente de novo.");
      return;
    }
    setFixos((l) => l.filter((i) => i.id !== id));
  }

  async function addVariavel() {
    const valor = toNumber(vValor);
    if (valor <= 0) return;
    const { data, error } = await supabase
      .from("variable_expenses")
      .insert({
        user_id: user.id,
        description: vDesc.trim() || null,
        category: vCat,
        amount: valor,
        spent_at: hojeISO(),
      })
      .select()
      .single();
    if (error) {
      setErro("Não foi possível salvar o gasto. Tente de novo.");
      return;
    }
    setErro("");
    setVariaveis((l) => [fromVar(data), ...l]);
    setVDesc("");
    setVValor("");
  }

  async function removeVariavel(id) {
    const { error } = await supabase
      .from("variable_expenses")
      .delete()
      .eq("id", id);
    if (error) {
      setErro("Não foi possível remover. Tente de novo.");
      return;
    }
    setVariaveis((l) => l.filter((i) => i.id !== id));
  }

  if (loading || !user) return null;

  const comprometido = totalFixos + totalVariaveis;
  const sobra = totalRenda - comprometido;
  const pctComprometido =
    totalRenda > 0 ? Math.min(100, (comprometido / totalRenda) * 100) : 0;
  const dias = diasRestantesNoMes();
  const porDia = sobra > 0 ? sobra / dias : 0;

  const fixosOrdenados = [...fixos]
    .sort((a, b) => (a.dia || 99) - (b.dia || 99))
    .map((f) => ({ ...f, sub: f.dia ? `vence dia ${f.dia}` : null }));

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-6 py-10 md:px-12 md:py-14 pb-24 md:pb-14">
        <div className="mb-8">
          <p className="text-sm text-ember uppercase tracking-wide mb-1">
            {dateLabel}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
            Financeiro
          </h1>
          <p className="text-sm text-mute">
            Veja quanto entra, quanto já está comprometido e quanto sobra.
          </p>
        </div>

        {erro && (
          <div className="mb-4 rounded-lg border-l-2 border-ember bg-panel p-4">
            <p className="text-sm text-bone/90">{erro}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Resultado (primeiro no celular, à direita no desktop) */}
          <div className="min-w-0 md:order-2 flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-3">
                Sobra livre do mês
              </h2>
              <p
                className={
                  "font-serif text-4xl tabular-nums " +
                  (sobra < 0 ? "text-ember" : "text-bone")
                }
              >
                {carregado ? brl(sobra) : "—"}
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-ember transition-all"
                  style={{ width: `${pctComprometido}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-mute">
                {totalRenda > 0
                  ? `${pctComprometido.toFixed(0)}% da renda já foi em fixos e variáveis`
                  : "Adicione sua renda para ver o quanto está comprometido"}
              </p>

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <div>
                  <span className="text-bone font-medium tabular-nums">
                    {brl(totalRenda)}
                  </span>
                  <span className="text-mute text-xs block">RECEBO</span>
                </div>
                <div>
                  <span className="text-bone font-medium tabular-nums">
                    {brl(totalFixos)}
                  </span>
                  <span className="text-mute text-xs block">FIXOS</span>
                </div>
                <div>
                  <span className="text-bone font-medium tabular-nums">
                    {brl(totalVariaveis)}
                  </span>
                  <span className="text-mute text-xs block">VARIÁVEIS</span>
                </div>
              </div>
            </div>

            {sobra > 0 && (
              <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
                <p className="text-sm text-bone/90 leading-snug">
                  Dá para gastar cerca de{" "}
                  <strong className="text-bone">{brl(porDia)}</strong> por dia
                  nos {dias} dias que restam no mês.
                </p>
              </div>
            )}
            {sobra < 0 && (
              <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
                <p className="text-sm text-bone/90 leading-snug">
                  Fixos e variáveis passam da renda em {brl(Math.abs(sobra))}.
                  Revise os gastos ou some uma renda extra.
                </p>
              </div>
            )}
          </div>

          {/* Entradas, fixos e variáveis */}
          <div className="min-w-0 md:order-1 md:col-span-2 flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-2">
                Renda do mês
              </h2>
              <Lista
                itens={rendas}
                vazio="Nenhuma renda ainda. Comece pelo salário."
                onRemover={removeRenda}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Campo
                  className="basis-full"
                  placeholder="Ex.: Salário"
                  value={rNome}
                  onChange={(e) => setRNome(e.target.value)}
                />
                <Campo
                  className="min-w-0 flex-1"
                  placeholder="Valor"
                  inputMode="decimal"
                  value={rValor}
                  onChange={(e) => setRValor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRenda()}
                />
                <button
                  onClick={addRenda}
                  className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-2">
                Gastos fixos
              </h2>
              <Lista
                itens={fixosOrdenados}
                vazio="Nenhum gasto fixo ainda. Aluguel, internet, assinaturas..."
                onRemover={removeFixo}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Campo
                  className="basis-full"
                  placeholder="Ex.: Internet"
                  value={fNome}
                  onChange={(e) => setFNome(e.target.value)}
                />
                <Campo
                  className="min-w-0 flex-1"
                  placeholder="Valor"
                  inputMode="decimal"
                  value={fValor}
                  onChange={(e) => setFValor(e.target.value)}
                />
                <Campo
                  className="w-20"
                  placeholder="Dia"
                  inputMode="numeric"
                  value={fDia}
                  onChange={(e) => setFDia(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFixo()}
                />
                <button
                  onClick={addFixo}
                  className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-2">
                Gastos variáveis do mês
              </h2>
              <Lista
                itens={variaveis}
                vazio="Nenhum gasto variável neste mês. Mercado, lazer, transporte..."
                onRemover={removeVariavel}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Campo
                  className="basis-full"
                  placeholder="Descrição (opcional)"
                  value={vDesc}
                  onChange={(e) => setVDesc(e.target.value)}
                />
                <Seletor
                  className="basis-full"
                  value={vCat}
                  onChange={(e) => setVCat(e.target.value)}
                  aria-label="Categoria"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Seletor>
                <Campo
                  className="min-w-0 flex-1"
                  placeholder="Valor"
                  inputMode="decimal"
                  value={vValor}
                  onChange={(e) => setVValor(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addVariavel()}
                />
                <button
                  onClick={addVariavel}
                  className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}