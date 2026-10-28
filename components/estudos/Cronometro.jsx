"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";

const CHAVE = "estudo_cronometro_v1";
const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone placeholder:text-mute/60 focus:border-ember focus:outline-none";
const LABEL = "mb-1 block text-xs text-mute";

function fmt(totalSeg) {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function ler() {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function gravar(estado) {
  try {
    if (estado) localStorage.setItem(CHAVE, JSON.stringify(estado));
    else localStorage.removeItem(CHAVE);
  } catch {}
}

// estado: { materiaId, nota, dia, acumulado (ms), retomadoEm (ms ou null) }
export default function Cronometro({ user, materias, onSalvo }) {
  const [estado, setEstado] = useState(() => ler());
  const [materiaId, setMateriaId] = useState(
    materias.length > 0 ? materias[0].id : ""
  );
  const [agora, setAgora] = useState(Date.now());
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const rodando = !!(estado && estado.retomadoEm);

  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [rodando]);

  function atualizar(novo) {
    setEstado(novo);
    gravar(novo);
  }

  function iniciar() {
    setErro("");
    const t = Date.now();
    setAgora(t);
    atualizar({
      materiaId: materiaId || null,
      nota: "",
      dia: todayISO(),
      acumulado: 0,
      retomadoEm: t,
    });
  }

  function pausar() {
    const t = Date.now();
    atualizar({
      ...estado,
      acumulado: estado.acumulado + (t - estado.retomadoEm),
      retomadoEm: null,
    });
  }

  function retomar() {
    const t = Date.now();
    setAgora(t);
    atualizar({ ...estado, retomadoEm: t });
  }

  function mudarCampo(campos) {
    atualizar({ ...estado, ...campos });
  }

  function decorridoMs() {
    if (!estado) return 0;
    return estado.acumulado + (estado.retomadoEm ? agora - estado.retomadoEm : 0);
  }

  async function finalizar() {
    setErro("");
    const total = decorridoMs();
    if (total < 30000) {
      setErro("Tempo muito curto pra salvar (menos de 30 segundos).");
      return;
    }
    const minutos = Math.min(1440, Math.max(1, Math.round(total / 60000)));

    setSalvando(true);
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        subject_id: estado.materiaId || null,
        day: estado.dia,
        minutes: minutos,
        note: (estado.nota || "").trim() || null,
      })
      .select()
      .single();
    setSalvando(false);

    if (error || !data) {
      setErro(
        "Não consegui salvar a sessão: " + (error ? error.message : "erro desconhecido")
      );
      return;
    }
    atualizar(null);
    onSalvo(data);
  }

  function descartar() {
    if (window.confirm("Descartar o cronômetro sem salvar?")) {
      setErro("");
      atualizar(null);
    }
  }

  // Se a matéria do cronômetro foi apagada, trata como "sem matéria"
  const materiaExiste = estado && materias.some((m) => m.id === estado.materiaId);
  const materiaAtual = estado ? (materiaExiste ? estado.materiaId : "") : "";

  if (!estado) {
    return (
      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="mb-4 text-xs uppercase tracking-wide text-mute">Cronômetro</p>
        {erro && (
          <div className="mb-4 rounded-lg border-l-2 border-ember bg-surface p-3 text-sm text-bone">
            {erro}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className={LABEL}>Matéria</label>
            <select
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
              className={INPUT}
            >
              <option value="">Sem matéria</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={iniciar}
            className="rounded-lg border border-ember px-5 py-2.5 text-sm font-medium text-ember"
          >
            Iniciar estudo
          </button>
        </div>
      </div>
    );
  }

  const decorrido = Math.floor(decorridoMs() / 1000);

  return (
    <div className="rounded-lg border border-ember bg-panel p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ember">
            {rodando ? "Estudando" : "Pausado"}
          </p>
          <select
            value={materiaAtual}
            onChange={(e) => mudarCampo({ materiaId: e.target.value || null })}
            className={INPUT + " mt-2"}
          >
            <option value="">Sem matéria</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <p className="font-serif text-4xl text-bone">{fmt(decorrido)}</p>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border-l-2 border-ember bg-surface p-3 text-sm text-bone">
          {erro}
        </div>
      )}

      <label className={LABEL}>Anotação (opcional)</label>
      <textarea
        value={estado.nota || ""}
        onChange={(e) => mudarCampo({ nota: e.target.value })}
        rows={2}
        placeholder="O que você está estudando"
        className={INPUT}
      />

      <div className="mt-5 flex flex-wrap items-center gap-4">
        {rodando ? (
          <button
            type="button"
            onClick={pausar}
            className="rounded-lg border border-ember px-5 py-2.5 text-sm font-medium text-ember"
          >
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={retomar}
            className="rounded-lg border border-ember px-5 py-2.5 text-sm font-medium text-ember"
          >
            Retomar
          </button>
        )}
        <button
          type="button"
          onClick={finalizar}
          disabled={salvando}
          className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Finalizar e salvar"}
        </button>
        <button
          type="button"
          onClick={descartar}
          className="text-sm text-mute hover:text-bone"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}