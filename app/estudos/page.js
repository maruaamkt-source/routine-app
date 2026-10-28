"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import Materias from "@/components/estudos/Materias";
import FormSessao from "@/components/estudos/FormSessao";
import SessoesRecentes from "@/components/estudos/SessoesRecentes";
import Cronometro from "@/components/estudos/Cronometro";
import ResumoEstudos from "@/components/estudos/ResumoEstudos";
import HeatmapEstudos from "@/components/estudos/HeatmapEstudos";
import { todayISO } from "@/lib/dateUtils";
import { inicioDaJanela } from "@/lib/esportesUtils";

function ordenarSessoes(lista) {
  return [...lista].sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      String(b.created_at).localeCompare(String(a.created_at))
  );
}

export default function EstudosPage() {
  const { user, loading } = useAuth();
  const [materias, setMaterias] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [metaHoras, setMetaHoras] = useState(5);
  const [temConfig, setTemConfig] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [diaSelecionado, setDiaSelecionado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function carregar() {
      const [m, s, cfg] = await Promise.all([
        supabase
          .from("study_subjects")
          .select("*")
          .eq("user_id", userId)
          .order("name"),
        supabase
          .from("study_sessions")
          .select("id, subject_id, day, minutes, note, created_at")
          .eq("user_id", userId)
          .gte("day", inicioDaJanela())
          .order("day", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("health_settings")
          .select("study_weekly_hours")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (cancelado) return;
      const error = m.error || s.error || cfg.error;
      if (error) {
        setErro(
          "Não consegui carregar os Estudos. Confira se o SQL foi rodado no Supabase. (" +
            error.message +
            ")"
        );
      }
      setMaterias(m.data || []);
      setSessoes(s.data || []);
      if (cfg.data) {
        setTemConfig(true);
        if (cfg.data.study_weekly_hours != null) {
          setMetaHoras(Number(cfg.data.study_weekly_hours));
        }
      }
      setCarregando(false);
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  if (loading || !user) return null;

  async function mudarMeta(delta) {
    const nova = Math.min(100, Math.max(1, metaHoras + delta));
    if (nova === metaHoras) return;
    const anterior = metaHoras;
    setMetaHoras(nova);

    const { error } = temConfig
      ? await supabase
          .from("health_settings")
          .update({ study_weekly_hours: nova })
          .eq("user_id", user.id)
      : await supabase
          .from("health_settings")
          .upsert(
            { user_id: user.id, workouts_per_week: 3, study_weekly_hours: nova },
            { onConflict: "user_id" }
          );

    if (error) {
      setMetaHoras(anterior);
      setErro("Não consegui salvar a meta: " + error.message);
      return;
    }
    setTemConfig(true);
  }

  function aoSalvarSessao(sessao) {
    setSessoes((prev) => {
      const existe = prev.some((x) => x.id === sessao.id);
      return ordenarSessoes(
        existe ? prev.map((x) => (x.id === sessao.id ? sessao : x)) : [sessao, ...prev]
      );
    });
    setMostrarForm(false);
    setEditando(null);
  }

  function iniciarEdicao(s) {
    setErro("");
    setMostrarForm(false);
    setEditando(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function apagarSessao(s) {
    if (!window.confirm("Apagar esta sessão?")) return;
    const { error } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", s.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui apagar a sessão: " + error.message);
      return;
    }
    setSessoes((prev) => prev.filter((x) => x.id !== s.id));
    if (editando && editando.id === s.id) setEditando(null);
  }

  const dataPorExtenso = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="md:flex">
      <Nav />
      <main className="min-w-0 flex-1 px-6 py-10 pb-14 md:px-12 md:py-14">
        <p className="mb-1 text-sm uppercase tracking-wide text-ember first-letter:uppercase">
          {dataPorExtenso}
        </p>
        <h1 className="mb-1 font-serif text-3xl text-bone md:text-4xl">Estudos</h1>
        <p className="text-sm text-mute">Suas matérias, sessões e meta de horas</p>

        <div className="mt-8 max-w-4xl">
          {erro && (
            <div className="mb-5 rounded-lg border-l-2 border-ember bg-panel p-4 text-sm text-bone">
              {erro}
            </div>
          )}

          {carregando ? (
            <p className="text-sm text-mute">Carregando...</p>
          ) : (
            <div className="space-y-5">
              <Cronometro user={user} materias={materias} onSalvo={aoSalvarSessao} />

              <ResumoEstudos
                sessoes={sessoes}
                materias={materias}
                metaHoras={metaHoras}
                onMudarMeta={mudarMeta}
              />

              {editando ? (
                <FormSessao
                  key={editando.id}
                  user={user}
                  materias={materias}
                  editando={editando}
                  onSalvo={aoSalvarSessao}
                  onCancelar={() => setEditando(null)}
                />
              ) : mostrarForm ? (
                <FormSessao
                  key="nova"
                  user={user}
                  materias={materias}
                  onSalvo={aoSalvarSessao}
                  onCancelar={() => setMostrarForm(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarForm(true)}
                  className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
                >
                  + Registrar sessão
                </button>
              )}

              <SessoesRecentes
                sessoes={sessoes}
                materias={materias}
                onEditar={iniciarEdicao}
                onApagar={apagarSessao}
              />

              <Materias
                user={user}
                materias={materias}
                setMaterias={setMaterias}
                onErro={setErro}
              />

              <HeatmapEstudos
                sessoes={sessoes}
                materias={materias}
                hoje={todayISO()}
                selecionado={diaSelecionado}
                onSelecionar={(iso) =>
                  setDiaSelecionado((atual) => (atual === iso ? "" : iso))
                }
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}