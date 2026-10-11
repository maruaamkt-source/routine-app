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

// "2026-10-01": primeiro dia do mês atual (chave do pagamento do mês)
function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
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

// Mês da 1ª parcela, voltando (atual - 1) meses a partir de hoje
function inicioDaParcela(atual) {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - (atual - 1), 1);
  return `${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-01`;
}

// "2026-10-11" -> "11/10"
function dataCurta(iso) {
  const [, m, d] = String(iso).split("-");
  return `${d}/${m}`;
}

// número -> texto para campo de edição ("1500.5" -> "1500,5")
const valorParaCampo = (n) => String(n).replace(".", ",");

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
    descricao: desc,
    categoria: r.category,
    sub: desc ? `${r.category} · ${data}` : data,
    valor: Number(r.amount),
  };
};
const fromGoal = (r) => ({ id: r.id, nome: r.name, alvo: Number(r.target) });
const fromDeposit = (r) => ({
  id: r.id,
  metaId: r.goal_id,
  valor: Number(r.amount),
  data: r.deposited_at,
});
const fromInstallment = (r) => ({
  id: r.id,
  nome: r.name,
  valor: Number(r.installment_amount),
  total: Number(r.total_installments),
  inicio: r.start_month, // "YYYY-MM-01"
});

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

// Se passar onTogglePago, aparece uma bolinha de "pago neste mês" em cada item.
// Se passar onEditar, aparece o botão "editar". O item cujo id for igual a
// editId é desenhado pela função renderEdicao (campos de edição).
function Lista({
  itens,
  onRemover,
  onEditar,
  editId,
  renderEdicao,
  vazio,
  pagos,
  onTogglePago,
}) {
  if (itens.length === 0) {
    return <p className="text-sm text-mute py-2">{vazio}</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {itens.map((i) =>
        editId && editId === i.id ? (
          <li key={i.id} className="py-3">
            {renderEdicao()}
          </li>
        ) : (
          <li key={i.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {onTogglePago && (
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={(pagos || []).includes(i.id)}
                  onChange={() => onTogglePago(i.id)}
                  aria-label={`Marcar ${i.nome} como pago neste mês`}
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm text-bone">{i.nome}</p>
                {i.sub ? <p className="text-xs text-mute">{i.sub}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm text-bone tabular-nums">{brl(i.valor)}</span>
              {onEditar && (
                <button
                  onClick={() => onEditar(i)}
                  className="px-1 py-1 text-xs text-mute hover:text-ember"
                  aria-label={`Editar ${i.nome}`}
                >
                  editar
                </button>
              )}
              <button
                onClick={() => onRemover(i.id)}
                className="px-1 py-1 text-xs text-mute hover:text-ember"
                aria-label={`Remover ${i.nome}`}
              >
                remover
              </button>
            </div>
          </li>
        )
      )}
    </ul>
  );
}

const EDIT_VAZIO = {
  tipo: "",
  id: "",
  nome: "",
  valor: "",
  dia: "",
  total: "",
  atual: "",
  atualOrig: "",
  desc: "",
  categoria: CATEGORIAS[0],
};

export default function FinanceiroPage() {
  const { user, loading } = useAuth();
  const [rendas, setRendas] = useState([]);
  const [fixos, setFixos] = useState([]);
  const [pagos, setPagos] = useState([]); // ids dos fixos pagos neste mês
  const [parcelas, setParcelas] = useState([]);
  const [variaveis, setVariaveis] = useState([]);
  const [metas, setMetas] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");

  const [rNome, setRNome] = useState("");
  const [rValor, setRValor] = useState("");
  const [fNome, setFNome] = useState("");
  const [fValor, setFValor] = useState("");
  const [fDia, setFDia] = useState("");
  const [pNome, setPNome] = useState("");
  const [pValor, setPValor] = useState("");
  const [pTotal, setPTotal] = useState("");
  const [pAtual, setPAtual] = useState("");
  const [vDesc, setVDesc] = useState("");
  const [vCat, setVCat] = useState(CATEGORIAS[0]);
  const [vValor, setVValor] = useState("");
  const [mNome, setMNome] = useState("");
  const [mAlvo, setMAlvo] = useState("");
  const [guardarValor, setGuardarValor] = useState({});
  const [historicoAberto, setHistoricoAberto] = useState({}); // { metaId: true }
  const [edit, setEdit] = useState(null); // item em edição (ou null)

  const loadData = useCallback(async () => {
    if (!user) return;

    const { ini, fim } = limitesDoMes();

    const [inc, fix, vars, gls, dps, ins, pay] = await Promise.all([
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
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("goal_deposits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("installments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("fixed_payments")
        .select("fixed_expense_id")
        .eq("user_id", user.id)
        .eq("ref_month", mesAtualISO()),
    ]);

    if (
      inc.error ||
      fix.error ||
      vars.error ||
      gls.error ||
      dps.error ||
      ins.error ||
      pay.error
    ) {
      setErro(
        "Não foi possível carregar seus dados. Confira se as tabelas foram criadas."
      );
      setCarregado(true);
      return;
    }

    let rendasDb = (inc.data ?? []).map(fromIncome);
    let fixosDb = (fix.data ?? []).map(fromFixed);
    const varsDb = (vars.data ?? []).map(fromVar);
    const metasDb = (gls.data ?? []).map(fromGoal);
    const depositosDb = (dps.data ?? []).map(fromDeposit);
    const parcelasDb = (ins.data ?? []).map(fromInstallment);
    const pagosDb = (pay.data ?? []).map((r) => r.fixed_expense_id);

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
    setMetas(metasDb);
    setDepositos(depositosDb);
    setParcelas(parcelasDb);
    setPagos(pagosDb);
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

  // Variáveis do mês somados por categoria (do maior pro menor)
  const resumoCategorias = useMemo(() => {
    const mapa = {};
    variaveis.forEach((v) => {
      mapa[v.categoria] = (mapa[v.categoria] || 0) + v.valor;
    });
    const total = Object.values(mapa).reduce((s, n) => s + n, 0);
    return Object.entries(mapa)
      .map(([categoria, valor]) => ({
        categoria,
        total: valor,
        pct: total > 0 ? (valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [variaveis]);

  // Só o que foi guardado NESTE mês sai da sobra
  const guardadoNoMes = useMemo(() => {
    const { ini, fim } = limitesDoMes();
    return depositos
      .filter((d) => d.data >= ini && d.data <= fim)
      .reduce((s, d) => s + d.valor, 0);
  }, [depositos]);

  // Cada meta com o total guardado (todos os meses), o progresso
  // e o histórico de depósitos (mais recente primeiro)
  const metasView = useMemo(
    () =>
      metas.map((m) => {
        const doDaMeta = depositos.filter((d) => d.metaId === m.id);
        const guardado = doDaMeta.reduce((s, d) => s + d.valor, 0);
        const pct = m.alvo > 0 ? Math.min(100, (guardado / m.alvo) * 100) : 0;
        const historico = [...doDaMeta].reverse();
        return { ...m, guardado, pct, historico };
      }),
    [metas, depositos]
  );

  // Cada parcelamento com a parcela deste mês e o status
  // ativa = está rodando agora | futura = ainda não começou | quitada = acabou
  const parcelasView = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getFullYear() * 12 + hoje.getMonth();
    const ordem = { ativa: 0, futura: 1, quitada: 2 };
    return parcelas
      .map((p) => {
        const [sy, sm] = String(p.inicio).split("-").map(Number);
        const numero = mesAtual - (sy * 12 + (sm - 1)) + 1;
        let status = "ativa";
        if (numero < 1) status = "futura";
        else if (numero > p.total) status = "quitada";
        return { ...p, numero, status, inicioLabel: `${pad(sm)}/${sy}` };
      })
      .sort((a, b) => ordem[a.status] - ordem[b.status]);
  }, [parcelas]);

  const totalParcelasMes = useMemo(
    () =>
      parcelasView
        .filter((p) => p.status === "ativa")
        .reduce((s, p) => s + p.valor, 0),
    [parcelasView]
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
    setPagos((l) => l.filter((x) => x !== id));
  }

  // Marca/desmarca o gasto fixo como pago neste mês
  async function togglePago(id) {
    const jaPago = pagos.includes(id);

    if (jaPago) {
      const { error } = await supabase
        .from("fixed_payments")
        .delete()
        .eq("fixed_expense_id", id)
        .eq("ref_month", mesAtualISO());
      if (error) {
        setErro("Não foi possível atualizar. Tente de novo.");
        return;
      }
      setErro("");
      setPagos((l) => l.filter((x) => x !== id));
    } else {
      const { error } = await supabase.from("fixed_payments").insert({
        user_id: user.id,
        fixed_expense_id: id,
        ref_month: mesAtualISO(),
      });
      if (error) {
        setErro("Não foi possível atualizar. Tente de novo.");
        return;
      }
      setErro("");
      setPagos((l) => [...l, id]);
    }
  }

  async function addParcela() {
    const valor = toNumber(pValor);
    if (!pNome.trim() || valor <= 0) return;

    const total = parseInt(pTotal, 10) || 0;
    if (total < 1 || total > 120) {
      setErro("Informe o total de parcelas (de 1 a 120).");
      return;
    }

    // parcela em que você está agora (vazio = primeira)
    const atual = Math.min(total, Math.max(1, parseInt(pAtual, 10) || 1));

    const { data, error } = await supabase
      .from("installments")
      .insert({
        user_id: user.id,
        name: pNome.trim(),
        installment_amount: valor,
        total_installments: total,
        start_month: inicioDaParcela(atual),
      })
      .select()
      .single();
    if (error) {
      setErro("Não foi possível salvar o parcelamento. Tente de novo.");
      return;
    }
    setErro("");
    setParcelas((l) => [...l, fromInstallment(data)]);
    setPNome("");
    setPValor("");
    setPTotal("");
    setPAtual("");
  }

  async function removeParcela(id) {
    const { error } = await supabase.from("installments").delete().eq("id", id);
    if (error) {
      setErro("Não foi possível remover. Tente de novo.");
      return;
    }
    setParcelas((l) => l.filter((p) => p.id !== id));
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

  async function addMeta() {
    const alvo = toNumber(mAlvo);
    if (!mNome.trim() || alvo <= 0) return;
    const { data, error } = await supabase
      .from("goals")
      .insert({ user_id: user.id, name: mNome.trim(), target: alvo })
      .select()
      .single();
    if (error) {
      setErro("Não foi possível criar a meta. Tente de novo.");
      return;
    }
    setErro("");
    setMetas((l) => [...l, fromGoal(data)]);
    setMNome("");
    setMAlvo("");
  }

  async function removeMeta(id) {
    const ok = window.confirm(
      "Remover essa meta e tudo que foi guardado nela? O valor deste mês volta para a sobra livre."
    );
    if (!ok) return;
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      setErro("Não foi possível remover a meta. Tente de novo.");
      return;
    }
    setErro("");
    setMetas((l) => l.filter((m) => m.id !== id));
    setDepositos((l) => l.filter((d) => d.metaId !== id));
  }

  async function guardar(metaId) {
    const valor = toNumber(guardarValor[metaId] || "");
    if (valor <= 0) return;
    const { data, error } = await supabase
      .from("goal_deposits")
      .insert({
        user_id: user.id,
        goal_id: metaId,
        amount: valor,
        deposited_at: hojeISO(),
      })
      .select()
      .single();
    if (error) {
      setErro("Não foi possível guardar o valor. Tente de novo.");
      return;
    }
    setErro("");
    setDepositos((l) => [...l, fromDeposit(data)]);
    setGuardarValor((g) => ({ ...g, [metaId]: "" }));
  }

  // Desfaz um depósito específico de uma meta
  async function desfazerDeposito(dep) {
    const ok = window.confirm(
      `Desfazer o depósito de ${brl(dep.valor)} feito em ${dataCurta(dep.data)}?`
    );
    if (!ok) return;
    const { error } = await supabase
      .from("goal_deposits")
      .delete()
      .eq("id", dep.id);
    if (error) {
      setErro("Não foi possível desfazer o depósito. Tente de novo.");
      return;
    }
    setErro("");
    setDepositos((l) => l.filter((d) => d.id !== dep.id));
  }

  function toggleHistorico(metaId) {
    setHistoricoAberto((h) => ({ ...h, [metaId]: !h[metaId] }));
  }

  // ---------- EDIÇÃO ----------

  // Abre a edição de um item. tipo: renda | fixo | parcela | variavel | meta
  function iniciarEdicao(tipo, item) {
    const base = { ...EDIT_VAZIO, tipo, id: item.id, nome: item.nome };

    if (tipo === "renda") {
      setEdit({ ...base, valor: valorParaCampo(item.valor) });
    } else if (tipo === "fixo") {
      setEdit({
        ...base,
        valor: valorParaCampo(item.valor),
        dia: item.dia ? String(item.dia) : "",
      });
    } else if (tipo === "variavel") {
      setEdit({
        ...base,
        desc: item.descricao || "",
        categoria: item.categoria,
        valor: valorParaCampo(item.valor),
      });
    } else if (tipo === "parcela") {
      const atual = item.status === "ativa" ? String(item.numero) : "";
      setEdit({
        ...base,
        valor: valorParaCampo(item.valor),
        total: String(item.total),
        atual,
        atualOrig: atual,
      });
    } else if (tipo === "meta") {
      setEdit({ ...base, valor: valorParaCampo(item.alvo) });
    }
  }

  function cancelarEdicao() {
    setEdit(null);
  }

  function setEd(campo, valor) {
    setEdit((e) => ({ ...e, [campo]: valor }));
  }

  async function salvarEdicao() {
    if (!edit) return;
    const { tipo, id } = edit;
    const valor = toNumber(edit.valor);
    const msgSalvar = "Não foi possível salvar a edição. Tente de novo.";

    if (tipo === "renda") {
      if (!edit.nome.trim() || valor <= 0) {
        setErro("Preencha o nome e um valor maior que zero.");
        return;
      }
      const { data, error } = await supabase
        .from("income")
        .update({ name: edit.nome.trim(), amount: valor })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        setErro(msgSalvar);
        return;
      }
      setRendas((l) => l.map((i) => (i.id === id ? fromIncome(data) : i)));
    } else if (tipo === "fixo") {
      if (!edit.nome.trim() || valor <= 0) {
        setErro("Preencha o nome e um valor maior que zero.");
        return;
      }
      const dia = Math.min(31, Math.max(1, parseInt(edit.dia, 10) || 0)) || null;
      const { data, error } = await supabase
        .from("fixed_expenses")
        .update({ name: edit.nome.trim(), amount: valor, due_day: dia })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        setErro(msgSalvar);
        return;
      }
      setFixos((l) => l.map((i) => (i.id === id ? fromFixed(data) : i)));
    } else if (tipo === "variavel") {
      if (valor <= 0) {
        setErro("Informe um valor maior que zero.");
        return;
      }
      const { data, error } = await supabase
        .from("variable_expenses")
        .update({
          description: edit.desc.trim() || null,
          category: edit.categoria,
          amount: valor,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        setErro(msgSalvar);
        return;
      }
      setVariaveis((l) => l.map((i) => (i.id === id ? fromVar(data) : i)));
    } else if (tipo === "parcela") {
      if (!edit.nome.trim() || valor <= 0) {
        setErro("Preencha o nome e um valor maior que zero.");
        return;
      }
      const total = parseInt(edit.total, 10) || 0;
      if (total < 1 || total > 120) {
        setErro("Informe o total de parcelas (de 1 a 120).");
        return;
      }
      const campos = {
        name: edit.nome.trim(),
        installment_amount: valor,
        total_installments: total,
      };
      // Só muda o mês de início se o campo "Atual" foi alterado
      const atualTxt = edit.atual.trim();
      if (atualTxt && atualTxt !== edit.atualOrig) {
        const atual = Math.min(total, Math.max(1, parseInt(atualTxt, 10) || 1));
        campos.start_month = inicioDaParcela(atual);
      }
      const { data, error } = await supabase
        .from("installments")
        .update(campos)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        setErro(msgSalvar);
        return;
      }
      setParcelas((l) => l.map((i) => (i.id === id ? fromInstallment(data) : i)));
    } else if (tipo === "meta") {
      if (!edit.nome.trim() || valor <= 0) {
        setErro("Preencha o nome e um valor alvo maior que zero.");
        return;
      }
      const { data, error } = await supabase
        .from("goals")
        .update({ name: edit.nome.trim(), target: valor })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        setErro(msgSalvar);
        return;
      }
      setMetas((l) => l.map((i) => (i.id === id ? fromGoal(data) : i)));
    }

    setErro("");
    setEdit(null);
  }

  // Enter salva, Esc cancela
  function teclasEdicao(e) {
    if (e.key === "Enter") salvarEdicao();
    if (e.key === "Escape") cancelarEdicao();
  }

  // id do item em edição, só se for do tipo pedido
  function idEditando(tipo) {
    return edit && edit.tipo === tipo ? edit.id : null;
  }

  // Campos de edição (mudam conforme o tipo do item aberto)
  function formEdicao() {
    if (!edit) return null;

    const botoes = (
      <div className="flex basis-full gap-2">
        <button
          onClick={salvarEdicao}
          className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
        >
          Salvar
        </button>
        <button
          onClick={cancelarEdicao}
          className="rounded-lg border border-line px-5 py-2.5 text-sm text-mute hover:text-bone"
        >
          Cancelar
        </button>
      </div>
    );

    if (edit.tipo === "variavel") {
      return (
        <div className="flex flex-wrap gap-2">
          <Campo
            className="basis-full"
            placeholder="Descrição (opcional)"
            value={edit.desc}
            onChange={(e) => setEd("desc", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          <Seletor
            className="basis-full"
            value={edit.categoria}
            onChange={(e) => setEd("categoria", e.target.value)}
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
            value={edit.valor}
            onChange={(e) => setEd("valor", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          {botoes}
        </div>
      );
    }

    if (edit.tipo === "fixo") {
      return (
        <div className="flex flex-wrap gap-2">
          <Campo
            className="basis-full"
            placeholder="Nome"
            value={edit.nome}
            onChange={(e) => setEd("nome", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          <Campo
            className="min-w-0 flex-1"
            placeholder="Valor"
            inputMode="decimal"
            value={edit.valor}
            onChange={(e) => setEd("valor", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          <Campo
            className="w-20"
            placeholder="Dia"
            inputMode="numeric"
            value={edit.dia}
            onChange={(e) => setEd("dia", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          {botoes}
        </div>
      );
    }

    if (edit.tipo === "parcela") {
      return (
        <div className="flex flex-wrap gap-2">
          <Campo
            className="basis-full"
            placeholder="Nome"
            value={edit.nome}
            onChange={(e) => setEd("nome", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          <Campo
            className="min-w-0 flex-1"
            placeholder="Valor da parcela"
            inputMode="decimal"
            value={edit.valor}
            onChange={(e) => setEd("valor", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          <Campo
            className="w-20"
            placeholder="Total"
            inputMode="numeric"
            value={edit.total}
            onChange={(e) => setEd("total", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          <Campo
            className="w-20"
            placeholder="Atual"
            inputMode="numeric"
            value={edit.atual}
            onChange={(e) => setEd("atual", e.target.value)}
            onKeyDown={teclasEdicao}
          />
          <p className="basis-full text-xs text-mute">
            Total = quantas parcelas tem a compra. Atual = qual parcela você
            paga neste mês (não mexa se não quiser mudar).
          </p>
          {botoes}
        </div>
      );
    }

    // renda e meta: nome + valor
    return (
      <div className="flex flex-wrap gap-2">
        <Campo
          className="basis-full"
          placeholder="Nome"
          value={edit.nome}
          onChange={(e) => setEd("nome", e.target.value)}
          onKeyDown={teclasEdicao}
        />
        <Campo
          className="min-w-0 flex-1"
          placeholder={edit.tipo === "meta" ? "Valor alvo" : "Valor"}
          inputMode="decimal"
          value={edit.valor}
          onChange={(e) => setEd("valor", e.target.value)}
          onKeyDown={teclasEdicao}
        />
        {botoes}
      </div>
    );
  }

  if (loading || !user) return null;

  const comprometido =
    totalFixos + totalParcelasMes + totalVariaveis + guardadoNoMes;
  const sobra = totalRenda - comprometido;
  const pctComprometido =
    totalRenda > 0 ? Math.min(100, (comprometido / totalRenda) * 100) : 0;
  const dias = diasRestantesNoMes();
  const porDia = sobra > 0 ? sobra / dias : 0;

  const fixosOrdenados = [...fixos]
    .sort((a, b) => (a.dia || 99) - (b.dia || 99))
    .map((f) => {
      const partes = [];
      if (f.dia) partes.push(`vence dia ${f.dia}`);
      if (pagos.includes(f.id)) partes.push("pago");
      return { ...f, sub: partes.length ? partes.join(" · ") : null };
    });

  const dateLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-6 py-10 md:px-12 md:py-14 pb-14">
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
                  ? `${pctComprometido.toFixed(0)}% da renda já foi em gastos e metas`
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
                    {brl(totalParcelasMes)}
                  </span>
                  <span className="text-mute text-xs block">PARCELAS</span>
                </div>
                <div>
                  <span className="text-bone font-medium tabular-nums">
                    {brl(totalVariaveis)}
                  </span>
                  <span className="text-mute text-xs block">VARIÁVEIS</span>
                </div>
                <div>
                  <span className="text-bone font-medium tabular-nums">
                    {brl(guardadoNoMes)}
                  </span>
                  <span className="text-mute text-xs block">GUARDADO</span>
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
                  Fixos, parcelas, variáveis e metas passam da renda em{" "}
                  {brl(Math.abs(sobra))}. Revise os gastos ou some uma renda
                  extra.
                </p>
              </div>
            )}

            {resumoCategorias.length > 0 && (
              <div className="rounded-lg border border-line bg-panel p-5">
                <h2 className="text-xs tracking-wide text-mute uppercase mb-3">
                  Variáveis por categoria
                </h2>
                <ul className="flex flex-col gap-3">
                  {resumoCategorias.map((c) => (
                    <li key={c.categoria}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-sm text-bone">
                          {c.categoria}
                        </span>
                        <span className="shrink-0 text-sm text-bone tabular-nums">
                          {brl(c.total)}{" "}
                          <span className="text-xs text-mute">
                            {c.pct.toFixed(0)}%
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-ember transition-all"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Entradas, fixos, parcelas, variáveis e metas */}
          <div className="min-w-0 md:order-1 md:col-span-2 flex flex-col gap-4">
            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-2">
                Renda do mês
              </h2>
              <Lista
                itens={rendas}
                vazio="Nenhuma renda ainda. Comece pelo salário."
                onRemover={removeRenda}
                onEditar={(i) => iniciarEdicao("renda", i)}
                editId={idEditando("renda")}
                renderEdicao={formEdicao}
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
                onEditar={(i) => iniciarEdicao("fixo", i)}
                editId={idEditando("fixo")}
                renderEdicao={formEdicao}
                pagos={pagos}
                onTogglePago={togglePago}
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
              {fixos.length > 0 && (
                <p className="mt-2 text-xs text-mute">
                  Marque a bolinha quando pagar a conta deste mês. Ela some do
                  aviso da tela Hoje e volta desmarcada no mês seguinte.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-2">
                Parcelas
              </h2>

              {parcelasView.length === 0 ? (
                <p className="text-sm text-mute py-2">
                  Nenhuma compra parcelada. Celular, geladeira, cartão...
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {parcelasView.map((p) =>
                    idEditando("parcela") === p.id ? (
                      <li key={p.id} className="py-3">
                        {formEdicao()}
                      </li>
                    ) : (
                      <li
                        key={p.id}
                        className={
                          "py-3 " + (p.status === "ativa" ? "" : "opacity-60")
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-bone">{p.nome}</p>
                            <p className="text-xs text-mute">
                              {p.status === "ativa" &&
                                (p.total - p.numero === 0
                                  ? `Parcela ${p.numero} de ${p.total} · última parcela`
                                  : `Parcela ${p.numero} de ${p.total} · faltam ${
                                      p.total - p.numero
                                    }`)}
                              {p.status === "futura" &&
                                `Começa em ${p.inicioLabel} · ${p.total} parcelas`}
                              {p.status === "quitada" &&
                                `Quitada · ${p.total} parcelas`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-sm text-bone tabular-nums">
                              {brl(p.valor)}
                            </span>
                            <button
                              onClick={() => iniciarEdicao("parcela", p)}
                              className="px-1 py-1 text-xs text-mute hover:text-ember"
                              aria-label={`Editar ${p.nome}`}
                            >
                              editar
                            </button>
                            <button
                              onClick={() => removeParcela(p.id)}
                              className="px-1 py-1 text-xs text-mute hover:text-ember"
                              aria-label={`Remover ${p.nome}`}
                            >
                              remover
                            </button>
                          </div>
                        </div>
                        {p.status === "ativa" && (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                            <div
                              className="h-full rounded-full bg-ember transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (p.numero / p.total) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </li>
                    )
                  )}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Campo
                  className="basis-full"
                  placeholder="Ex.: Celular"
                  value={pNome}
                  onChange={(e) => setPNome(e.target.value)}
                />
                <Campo
                  className="min-w-0 flex-1"
                  placeholder="Valor da parcela"
                  inputMode="decimal"
                  value={pValor}
                  onChange={(e) => setPValor(e.target.value)}
                />
                <Campo
                  className="w-20"
                  placeholder="Total"
                  inputMode="numeric"
                  value={pTotal}
                  onChange={(e) => setPTotal(e.target.value)}
                />
                <Campo
                  className="w-20"
                  placeholder="Atual"
                  inputMode="numeric"
                  value={pAtual}
                  onChange={(e) => setPAtual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addParcela()}
                />
                <button
                  onClick={addParcela}
                  className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
                >
                  Adicionar
                </button>
              </div>
              <p className="mt-2 text-xs text-mute">
                Total = quantas parcelas tem a compra. Atual = qual parcela você
                está pagando neste mês (deixe vazio se for a primeira).
              </p>
            </div>

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-2">
                Gastos variáveis do mês
              </h2>
              <Lista
                itens={variaveis}
                vazio="Nenhum gasto variável neste mês. Mercado, lazer, transporte..."
                onRemover={removeVariavel}
                onEditar={(i) => iniciarEdicao("variavel", i)}
                editId={idEditando("variavel")}
                renderEdicao={formEdicao}
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

            <div className="rounded-lg border border-line bg-panel p-5">
              <h2 className="text-xs tracking-wide text-mute uppercase mb-2">
                Metas e reservas
              </h2>

              {metasView.length === 0 ? (
                <p className="text-sm text-mute py-2">
                  Nenhuma meta ainda. Reserva de emergência, viagem, um
                  presente...
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {metasView.map((m) => (
                    <li key={m.id} className="py-4">
                      {idEditando("meta") === m.id ? (
                        formEdicao()
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm text-bone">
                            {m.nome}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => iniciarEdicao("meta", m)}
                              className="px-1 py-1 text-xs text-mute hover:text-ember"
                              aria-label={`Editar meta ${m.nome}`}
                            >
                              editar
                            </button>
                            <button
                              onClick={() => removeMeta(m.id)}
                              className="px-1 py-1 text-xs text-mute hover:text-ember"
                              aria-label={`Remover meta ${m.nome}`}
                            >
                              remover
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex items-baseline justify-between gap-3">
                        <span className="text-sm text-bone tabular-nums">
                          {brl(m.guardado)}{" "}
                          <span className="text-mute">de {brl(m.alvo)}</span>
                        </span>
                        <span className="text-xs text-mute tabular-nums">
                          {m.pct.toFixed(0)}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-ember transition-all"
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-mute">
                        {m.guardado >= m.alvo
                          ? "Meta atingida!"
                          : `Faltam ${brl(m.alvo - m.guardado)}`}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <Campo
                          className="min-w-0 flex-1"
                          placeholder="Quanto guardar agora?"
                          inputMode="decimal"
                          value={guardarValor[m.id] || ""}
                          onChange={(e) =>
                            setGuardarValor((g) => ({
                              ...g,
                              [m.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && guardar(m.id)}
                        />
                        <button
                          onClick={() => guardar(m.id)}
                          className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
                        >
                          Guardar
                        </button>
                      </div>

                      {m.historico.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleHistorico(m.id)}
                            className="text-xs text-ember"
                            aria-expanded={!!historicoAberto[m.id]}
                          >
                            {historicoAberto[m.id]
                              ? "Esconder histórico"
                              : `Ver histórico (${m.historico.length})`}
                          </button>

                          {historicoAberto[m.id] && (
                            <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface px-3">
                              {m.historico.map((d) => (
                                <li
                                  key={d.id}
                                  className="flex items-center justify-between gap-3 py-2"
                                >
                                  <span className="text-xs text-mute">
                                    {dataCurta(d.data)}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-bone tabular-nums">
                                      {brl(d.valor)}
                                    </span>
                                    <button
                                      onClick={() => desfazerDeposito(d)}
                                      className="px-1 py-1 text-xs text-mute hover:text-ember"
                                      aria-label={`Desfazer depósito de ${brl(
                                        d.valor
                                      )}`}
                                    >
                                      desfazer
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <Campo
                  className="basis-full"
                  placeholder="Nome da meta (ex.: Reserva de emergência)"
                  value={mNome}
                  onChange={(e) => setMNome(e.target.value)}
                />
                <Campo
                  className="min-w-0 flex-1"
                  placeholder="Valor alvo"
                  inputMode="decimal"
                  value={mAlvo}
                  onChange={(e) => setMAlvo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMeta()}
                />
                <button
                  onClick={addMeta}
                  className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
                >
                  Criar meta
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}