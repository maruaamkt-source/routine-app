"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { todayISO, getWeekDates, toISODate } from "@/lib/dateUtils";
import {
  diaCurto,
  formatarMinutos,
  formatarNumero,
  resumoExercicio,
  temExercicios,
  inicioDaJanela,
} from "@/lib/esportesUtils";
import Heatmap from "@/components/esportes/Heatmap";
import FormTreino from "@/components/esportes/FormTreino";
import Evolucao from "@/components/esportes/Evolucao";

function ordenar(lista) {
  return [...lista].sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      String(b.created_at).localeCompare(String(a.created_at))
  );
}

function TreinoItem({ t, aberto, exercicios, onToggle, onEditar, onApagar }) {
  return (
    <li className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm text-bone">
            {t.type}
            {t.name ? ` · ${t.name}` : ""}
          </span>
          <span className="block text-xs text-mute">
            {diaCurto(t.day)} · {formatarMinutos(t.minutes)}
            {t.km ? ` · ${formatarNumero(t.km)} km` : ""}
          </span>
        </span>
        <span className="shrink-0 text-xs text-mute">{aberto ? "Fechar" : "Ver"}</span>
      </button>

      {aberto && (
        <div className="space-y-2 border-t border-line px-4 py-3">
          {temExercicios(t.type) &&
            (exercicios === undefined ? (
              <p className="text-xs text-mute">Carregando...</p>
            ) : exercicios.length === 0 ? (
              <p className="text-xs text-mute">Sem exercícios registrados.</p>
            ) : (
              <ul className="space-y-1">
                {exercicios.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-bone">{e.name}</span>
                    <span className="shrink-0 text-mute">{resumoExercicio(e)}</span>
                  </li>
                ))}
              </ul>
            ))}
          {t.note && <p className="text-sm text-bone/90">{t.note}</p>}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onEditar}
              className="text-xs text-ember hover:underline"
            >
              Editar treino
            </button>
            <button
              type="button"
              onClick={onApagar}
              className="text-xs text-mute hover:text-bone"
            >
              Apagar treino
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function EsportesPage() {
  const { user, loading } = useAuth();

  const [treinos, setTreinos] = useState([]);
  const [nomes, setNomes] = useState([]);
  const [meta, setMeta] = useState(3);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("treinos");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [diaSelecionado, setDiaSelecionado] = useState("");
  const [visiveis, setVisiveis] = useState(10);
  const [abertoId, setAbertoId] = useState("");
  const [exPorTreino, setExPorTreino] = useState({});

  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function carregar() {
      const [t, s, n] = await Promise.all([
        supabase
          .from("workouts")
          .select("id, day, type, name, minutes, km, note, created_at")
          .eq("user_id", userId)
          .gte("day", inicioDaJanela())
          .order("day", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("health_settings")
          .select("workouts_per_week")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("workout_exercises")
          .select("name")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      if (cancelado) return;

      const primeiroErro = t.error || s.error || n.error;
      if (primeiroErro) {
        setErro(
          "Não consegui carregar o Esportes. Confira se o SQL foi rodado no Supabase. (" +
            primeiroErro.message +
            ")"
        );
      }

      setTreinos(t.data || []);
      if (s.data && s.data.workouts_per_week) setMeta(s.data.workouts_per_week);

      // nomes únicos, do exercício usado mais recentemente para o mais antigo
      const vistos = new Set();
      const lista = [];
      (n.data || []).forEach((r) => {
        if (!vistos.has(r.name)) {
          vistos.add(r.name);
          lista.push(r.name);
        }
      });
      setNomes(lista);
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  if (loading || !user) return null;

  const hoje = todayISO();
  const dataPorExtenso = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Resumo por dia (usado no heatmap, na meta e no total do mês)
  const porDia = {};
  treinos.forEach((t) => {
    const info = porDia[t.day] || { count: 0, minutes: 0 };
    info.count += 1;
    info.minutes += t.minutes || 0;
    porDia[t.day] = info;
  });

  const diasSemana = getWeekDates().map((d) => toISODate(d));
  const feitosSemana = diasSemana.filter((d) => porDia[d]).length;
  const pct = Math.min(100, Math.round((feitosSemana / meta) * 100));

  const prefixoMes = hoje.slice(0, 7);
  const diasDoMesTreinados = Object.keys(porDia).filter((d) => d.startsWith(prefixoMes));
  const minutosMes = diasDoMesTreinados.reduce((soma, d) => soma + porDia[d].minutes, 0);

  const doDia = treinos.filter((t) => t.day === diaSelecionado);

  async function mudarMeta(delta) {
    const nova = Math.min(7, Math.max(1, meta + delta));
    if (nova === meta) return;
    const anterior = meta;
    setMeta(nova);
    const { error } = await supabase.from("health_settings").upsert(
      {
        user_id: user.id,
        workouts_per_week: nova,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      setMeta(anterior);
      setErro("Não consegui salvar a meta: " + error.message);
    }
  }

  async function buscarExercicios(t) {
    const { data, error } = await supabase
      .from("workout_exercises")
      .select("id, name, sets, reps, weight_kg, position")
      .eq("workout_id", t.id)
      .eq("user_id", user.id)
      .order("position");
    if (error) {
      setErro("Não consegui carregar os exercícios: " + error.message);
      return null;
    }
    return data || [];
  }

  async function alternarTreino(t) {
    if (abertoId === t.id) {
      setAbertoId("");
      return;
    }
    setAbertoId(t.id);
    if (temExercicios(t.type) && exPorTreino[t.id] === undefined) {
      const lista = await buscarExercicios(t);
      if (lista === null) return;
      setExPorTreino((prev) => ({ ...prev, [t.id]: lista }));
    }
  }

  async function iniciarEdicao(t) {
    let exercicios = [];
    if (temExercicios(t.type)) {
      if (exPorTreino[t.id] !== undefined) {
        exercicios = exPorTreino[t.id];
      } else {
        const lista = await buscarExercicios(t);
        if (lista === null) return;
        exercicios = lista;
        setExPorTreino((prev) => ({ ...prev, [t.id]: lista }));
      }
    }
    setErro("");
    setMostrarForm(false);
    setEditando({ treino: t, exercicios });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function apagarTreino(t) {
    if (!window.confirm("Apagar este treino?")) return;
    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("id", t.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui apagar o treino: " + error.message);
      return;
    }
    setTreinos((prev) => prev.filter((x) => x.id !== t.id));
    if (abertoId === t.id) setAbertoId("");
    if (editando && editando.treino.id === t.id) setEditando(null);
  }

  function aoSalvar(treino, exerciciosInseridos) {
    setTreinos((prev) => {
      const jaExiste = prev.some((x) => x.id === treino.id);
      if (jaExiste) {
        return ordenar(prev.map((x) => (x.id === treino.id ? treino : x)));
      }
      return ordenar([treino, ...prev]);
    });
    setExPorTreino((prev) => ({ ...prev, [treino.id]: exerciciosInseridos }));
    setNomes((prev) => {
      const novos = exerciciosInseridos.map((e) => e.name);
      const restantes = prev.filter((n) => !novos.includes(n));
      return [...new Set(novos), ...restantes];
    });
    setDiaSelecionado(treino.day);
    setMostrarForm(false);
    setEditando(null);
  }

  function escolherDia(iso) {
    setDiaSelecionado((atual) => (atual === iso ? "" : iso));
  }

  return (
    <div className="md:flex">
      <Nav />
      <main className="min-w-0 flex-1 px-6 py-10 pb-14 md:px-12 md:py-14">
        <p className="mb-1 text-sm uppercase tracking-wide text-ember">{dataPorExtenso}</p>
        <h1 className="mb-1 font-serif text-3xl text-bone md:text-4xl">Esportes</h1>
        <p className="text-sm text-mute">Seus treinos, sua constância e sua evolução</p>

        <div className="mt-8 max-w-4xl">
          {erro && (
            <div className="mb-5 rounded-lg border-l-2 border-ember bg-panel p-4 text-sm text-bone">
              {erro}
            </div>
          )}

          <div className="mb-6 flex gap-2 border-b border-line">
            {[
              { id: "treinos", label: "Treinos" },
              { id: "evolucao", label: "Evolução" },
            ].map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAba(a.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
                  aba === a.id
                    ? "border-ember text-bone"
                    : "border-transparent text-mute hover:text-bone"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {carregando ? (
            <p className="text-sm text-mute">Carregando...</p>
          ) : aba === "evolucao" ? (
            <Evolucao user={user} nomes={nomes} />
          ) : (
            <div className="space-y-5">
              {/* Meta da semana */}
              <div className="rounded-lg border border-line bg-panel p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-wide text-mute">Meta da semana</p>
                  <div className="flex items-center gap-3 text-sm text-mute">
                    <button
                      type="button"
                      onClick={() => mudarMeta(-1)}
                      aria-label="Diminuir meta"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:text-bone"
                    >
                      −
                    </button>
                    <span className="text-bone">{meta}x</span>
                    <button
                      type="button"
                      onClick={() => mudarMeta(1)}
                      aria-label="Aumentar meta"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:text-bone"
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="mb-2 font-serif text-2xl text-bone">
                  {feitosSemana} de {meta} esta semana
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-ember" style={{ width: `${pct}%` }} />
                </div>
                {feitosSemana >= meta && (
                  <p className="mt-2 text-xs text-ember">Meta da semana batida!</p>
                )}
                <p className="mt-3 text-xs text-mute">
                  Este mês: {diasDoMesTreinados.length}{" "}
                  {diasDoMesTreinados.length === 1 ? "dia treinado" : "dias treinados"}
                  {minutosMes > 0 ? ` · ${formatarMinutos(minutosMes)}` : ""}
                </p>
              </div>

              {/* Registrar / Editar */}
              {editando ? (
                <FormTreino
                  key={editando.treino.id}
                  user={user}
                  treinos={treinos}
                  nomes={nomes}
                  treinoEditando={editando.treino}
                  exerciciosEditando={editando.exercicios}
                  onSalvo={aoSalvar}
                  onCancelar={() => setEditando(null)}
                />
              ) : mostrarForm ? (
                <FormTreino
                  user={user}
                  treinos={treinos}
                  nomes={nomes}
                  treinoEditando={null}
                  exerciciosEditando={[]}
                  onSalvo={aoSalvar}
                  onCancelar={() => setMostrarForm(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarForm(true)}
                  className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
                >
                  + Registrar treino
                </button>
              )}

              {/* Heatmap */}
              <div className="rounded-lg border border-line bg-panel p-5">
                <p className="mb-4 text-xs uppercase tracking-wide text-mute">
                  Dias treinados (12 meses)
                </p>
                <Heatmap
                  porDia={porDia}
                  hoje={hoje}
                  selecionado={diaSelecionado}
                  onSelecionar={escolherDia}
                />
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mute">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[3px] bg-ember/40" /> Treinou
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-[3px] bg-ember" /> 2x no dia ou mais de 60 min
                  </span>
                </div>

                {diaSelecionado && (
                  <div className="mt-5 border-t border-line pt-4">
                    <p className="mb-3 text-sm text-bone">{diaCurto(diaSelecionado)}</p>
                    {doDia.length === 0 ? (
                      <p className="text-sm text-mute">Nenhum treino neste dia.</p>
                    ) : (
                      <ul className="space-y-2">
                        {doDia.map((t) => (
                          <TreinoItem
                            key={t.id}
                            t={t}
                            aberto={abertoId === t.id}
                            exercicios={exPorTreino[t.id]}
                            onToggle={() => alternarTreino(t)}
                            onEditar={() => iniciarEdicao(t)}
                            onApagar={() => apagarTreino(t)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Recentes */}
              <div className="rounded-lg border border-line bg-panel p-5">
                <p className="mb-4 text-xs uppercase tracking-wide text-mute">Treinos recentes</p>
                {treinos.length === 0 ? (
                  <p className="text-sm text-mute">
                    Nenhum treino ainda. Toque em &quot;Registrar treino&quot; pra começar.
                  </p>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {treinos.slice(0, visiveis).map((t) => (
                        <TreinoItem
                          key={t.id}
                          t={t}
                          aberto={abertoId === t.id}
                          exercicios={exPorTreino[t.id]}
                          onToggle={() => alternarTreino(t)}
                          onEditar={() => iniciarEdicao(t)}
                          onApagar={() => apagarTreino(t)}
                        />
                      ))}
                    </ul>
                    {treinos.length > visiveis && (
                      <button
                        type="button"
                        onClick={() => setVisiveis((v) => v + 10)}
                        className="mt-4 text-sm text-ember hover:underline"
                      >
                        Ver mais
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}