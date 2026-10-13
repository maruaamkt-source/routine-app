"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";
import { METAS_PADRAO, ultimosDias } from "@/lib/saudeUtils";
import Hoje from "@/components/saude/Hoje";
import Medidas from "@/components/saude/Medidas";
import EvolucaoCorpo from "@/components/saude/EvolucaoCorpo";

function ordenar(lista) {
  return [...lista].sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      String(b.created_at).localeCompare(String(a.created_at))
  );
}

export default function SaudePage() {
  const { user, loading } = useAuth();

  const [aba, setAba] = useState("hoje");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [diario, setDiario] = useState({});
  const [medidas, setMedidas] = useState([]);
  const [metaAgua, setMetaAgua] = useState(METAS_PADRAO.agua);
  const [metaSono, setMetaSono] = useState(METAS_PADRAO.sono);
  const [metaTreinos, setMetaTreinos] = useState(3);
  const [pilhaAgua, setPilhaAgua] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;

    async function carregar() {
      const [d, m, s] = await Promise.all([
        supabase
          .from("health_daily")
          .select("day, water_ml, sleep_hours")
          .eq("user_id", userId)
          .gte("day", ultimosDias(30)[29])
          .limit(100),
        supabase
          .from("body_measurements")
          .select(
            "id, day, weight_kg, waist_cm, chest_cm, hip_cm, arm_cm, thigh_cm, created_at"
          )
          .eq("user_id", userId)
          .order("day", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("health_settings")
          .select("workouts_per_week, water_goal_ml, sleep_goal_hours")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (cancelado) return;

      const primeiroErro = d.error || m.error || s.error;
      if (primeiroErro) {
        setErro(
          "Não consegui carregar a Saúde. Confira se o SQL foi rodado no Supabase. (" +
            primeiroErro.message +
            ")"
        );
      }

      const mapa = {};
      (d.data || []).forEach((r) => {
        mapa[r.day] = r;
      });
      setDiario(mapa);
      setMedidas(m.data || []);

      if (s.data) {
        if (s.data.workouts_per_week) setMetaTreinos(s.data.workouts_per_week);
        if (s.data.water_goal_ml) setMetaAgua(Number(s.data.water_goal_ml));
        if (s.data.sleep_goal_hours) setMetaSono(Number(s.data.sleep_goal_hours));
      }
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

  async function gravarDia(campos) {
    const { error } = await supabase.from("health_daily").upsert(
      { user_id: user.id, day: hoje, ...campos },
      { onConflict: "user_id,day" }
    );
    return error;
  }

  async function somarAgua(ml) {
    if (salvando) return false;
    const atual = diario[hoje] ? Number(diario[hoje].water_ml) || 0 : 0;
    const novo = Math.max(0, atual + ml);
    setSalvando(true);
    const error = await gravarDia({ water_ml: novo });
    setSalvando(false);
    if (error) {
      setErro("Não consegui salvar a água: " + error.message);
      return false;
    }
    setDiario((prev) => ({
      ...prev,
      [hoje]: { ...(prev[hoje] || { sleep_hours: null }), day: hoje, water_ml: novo },
    }));
    if (ml > 0) setPilhaAgua((prev) => [...prev, ml]);
    return true;
  }

  async function desfazerAgua() {
    if (pilhaAgua.length === 0) return;
    const ultimo = pilhaAgua[pilhaAgua.length - 1];
    const ok = await somarAgua(-ultimo);
    if (ok) setPilhaAgua((prev) => prev.slice(0, -1));
  }

  async function salvarSono(horas) {
    if (salvando) return;
    setSalvando(true);
    const error = await gravarDia({ sleep_hours: horas });
    setSalvando(false);
    if (error) {
      setErro("Não consegui salvar o sono: " + error.message);
      return;
    }
    setDiario((prev) => ({
      ...prev,
      [hoje]: { ...(prev[hoje] || { water_ml: 0 }), day: hoje, sleep_hours: horas },
    }));
  }

  async function guardarMetas(agua, sono) {
    const anteriorAgua = metaAgua;
    const anteriorSono = metaSono;
    setMetaAgua(agua);
    setMetaSono(sono);
    const { error } = await supabase.from("health_settings").upsert(
      {
        user_id: user.id,
        workouts_per_week: metaTreinos,
        water_goal_ml: agua,
        sleep_goal_hours: sono,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      setMetaAgua(anteriorAgua);
      setMetaSono(anteriorSono);
      setErro("Não consegui salvar a meta: " + error.message);
    }
  }

  function mudarMetaAgua(delta) {
    const nova = Math.min(6000, Math.max(500, metaAgua + delta));
    if (nova === metaAgua) return;
    guardarMetas(nova, metaSono);
  }

  function mudarMetaSono(delta) {
    const nova = Math.min(12, Math.max(4, metaSono + delta));
    if (nova === metaSono) return;
    guardarMetas(metaAgua, nova);
  }

  function aoSalvarMedida(linha) {
    setMedidas((prev) => ordenar([linha, ...prev]));
  }

  function aoApagarMedida(id) {
    setMedidas((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="md:flex">
      <Nav />
      <main className="min-w-0 flex-1 px-6 py-10 pb-14 md:px-12 md:py-14">
        <p className="mb-1 text-sm uppercase tracking-wide text-ember">{dataPorExtenso}</p>
        <h1 className="mb-1 font-serif text-3xl text-bone md:text-4xl">Saúde</h1>
        <p className="text-sm text-mute">Água, sono, peso e medidas</p>

        <div className="mt-8 max-w-4xl">
          {erro && (
            <div className="mb-5 rounded-lg border-l-2 border-ember bg-panel p-4 text-sm text-bone">
              {erro}
            </div>
          )}

          <div className="mb-6 flex gap-2 overflow-x-auto border-b border-line">
            {[
              { id: "hoje", label: "Hoje" },
              { id: "medidas", label: "Peso e medidas" },
              { id: "evolucao", label: "Evolução" },
            ].map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAba(a.id)}
                className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm transition-colors ${
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
          ) : aba === "hoje" ? (
            <Hoje
              hoje={hoje}
              diario={diario}
              metaAgua={metaAgua}
              metaSono={metaSono}
              salvando={salvando}
              podeDesfazer={pilhaAgua.length > 0}
              onSomarAgua={somarAgua}
              onDesfazer={desfazerAgua}
              onSalvarSono={salvarSono}
              onMudarMetaAgua={mudarMetaAgua}
              onMudarMetaSono={mudarMetaSono}
            />
          ) : aba === "medidas" ? (
            <Medidas
              user={user}
              medidas={medidas}
              onSalvo={aoSalvarMedida}
              onApagado={aoApagarMedida}
            />
          ) : (
            <EvolucaoCorpo medidas={medidas} />
          )}
        </div>
      </main>
    </div>
  );
}