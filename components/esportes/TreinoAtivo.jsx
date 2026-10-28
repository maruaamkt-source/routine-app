"use client";

import { useEffect, useRef, useState } from "react";
import { paraNumero } from "@/lib/esportesUtils";

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone placeholder:text-mute/60 focus:border-ember focus:outline-none";
const LABEL = "mb-1 block text-xs text-mute";

function fmt(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const CHAVE_ATIVO = "treino_ativo_v1";

export function lerAtivoSalvo() {
  try {
    const raw = localStorage.getItem(CHAVE_ATIVO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function limparAtivoSalvo() {
  try {
    localStorage.removeItem(CHAVE_ATIVO);
  } catch {}
}

export default function TreinoAtivo({ plano, dia, salvando, onFinalizar, onCancelar }) {
  const salvo = useRef(null);
  if (salvo.current === null) {
    const s = lerAtivoSalvo();
    salvo.current =
      s && s.planoId === plano.id && s.dia === dia && Array.isArray(s.exs) ? s : false;
  }
  const sv = salvo.current || null;

  const inicio = useRef(sv ? sv.inicio : Date.now());
  const [agora, setAgora] = useState(Date.now());
  const [fimDescanso, setFimDescanso] = useState(null);
  const [duracao, setDuracao] = useState(sv ? sv.duracao : 90);
  const [erro, setErro] = useState("");
  const [exs, setExs] = useState(() =>
    sv
      ? sv.exs
      : (plano.exercises || []).map((e, i) => ({
          id: i,
          name: e.name,
          reps: String(e.reps),
          carga: Number(e.weight_kg) > 0 ? String(e.weight_kg).replace(".", ",") : "",
          muscle_group: e.muscle_group || null,
          marcadas: Array.from({ length: e.sets }, () => false),
        }))
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_ATIVO,
        JSON.stringify({
          planoId: plano.id,
          dia,
          inicio: inicio.current,
          duracao,
          exs,
        })
      );
    } catch {}
  }, [plano.id, dia, duracao, exs]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const restante = fimDescanso ? Math.max(0, Math.ceil((fimDescanso - agora) / 1000)) : 0;

  useEffect(() => {
    if (fimDescanso && restante === 0) {
      setFimDescanso(null);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [fimDescanso, restante]);

  function iniciarDescanso() {
    const agoraMs = Date.now();
    setAgora(agoraMs);
    setFimDescanso(agoraMs + duracao * 1000);
  }

  function alternar(id, i) {
    const ex = exs.find((e) => e.id === id);
    if (!ex.marcadas[i]) iniciarDescanso();
    setExs((prev) =>
      prev.map((e) =>
        e.id !== id ? e : { ...e, marcadas: e.marcadas.map((m, k) => (k === i ? !m : m)) }
      )
    );
  }

  function atualizar(id, campos) {
    setExs((prev) => prev.map((e) => (e.id === id ? { ...e, ...campos } : e)));
  }

  function maisSerie(id) {
    setExs((prev) =>
      prev.map((e) => (e.id === id ? { ...e, marcadas: [...e.marcadas, false] } : e))
    );
  }

  function finalizar() {
    setErro("");
    const lista = [];
    for (const e of exs) {
      const feitas = e.marcadas.filter(Boolean).length;
      if (feitas === 0) continue;
      const r = parseInt(e.reps, 10);
      const c = e.carga.trim() === "" ? 0 : paraNumero(e.carga);
      if (!(r >= 1) || Number.isNaN(c) || c < 0) {
        setErro(`Confira reps e carga de "${e.name}".`);
        return;
      }
      lista.push({
        name: e.name,
        muscle_group: e.muscle_group || null,
        sets: feitas,
        reps: r,
        weight_kg: c,
      });
    }
    if (lista.length === 0) {
      setErro("Marque pelo menos uma série.");
      return;
    }
    const minutos = Math.max(1, Math.round((Date.now() - inicio.current) / 60000));
    onFinalizar(lista, minutos);
  }

  function cancelar() {
    if (window.confirm("Descartar o treino em andamento?")) {
      limparAtivoSalvo();
      onCancelar();
    }
  }

  const decorrido = Math.floor((agora - inicio.current) / 1000);
  const totalSeries = exs.reduce((s, e) => s + e.marcadas.length, 0);
  const feitasTotal = exs.reduce((s, e) => s + e.marcadas.filter(Boolean).length, 0);

  return (
    <div className="rounded-lg border border-ember bg-panel p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ember">Treino em andamento</p>
          <p className="truncate font-serif text-xl text-bone">{plano.name}</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-xl text-bone">{fmt(decorrido)}</p>
          <p className="text-xs text-mute">
            {feitasTotal}/{totalSeries} séries
          </p>
        </div>
      </div>

      {restante > 0 && (
        <div className="mb-4 rounded-lg border border-line bg-surface p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-mute">Descanso</p>
          <p className="font-serif text-4xl text-ember">{fmt(restante)}</p>
          <button
            type="button"
            onClick={() => setFimDescanso(null)}
            className="mt-1 text-xs text-mute hover:text-bone"
          >
            Pular
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 text-xs text-mute">
        <span>Descanso entre séries:</span>
        <button
          type="button"
          onClick={() => setDuracao((d) => Math.max(15, d - 15))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:text-bone"
        >
          −
        </button>
        <span className="text-bone">{duracao}s</span>
        <button
          type="button"
          onClick={() => setDuracao((d) => Math.min(600, d + 15))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:text-bone"
        >
          +
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border-l-2 border-ember bg-surface p-3 text-sm text-bone">
          {erro}
        </div>
      )}

      <div className="space-y-3">
        {exs.map((e) => (
          <div key={e.id} className="rounded-lg border border-line bg-surface p-3">
            <p className="mb-2 text-sm text-bone">{e.name}</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL}>Reps</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={e.reps}
                  onChange={(ev) => atualizar(e.id, { reps: ev.target.value })}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Carga (kg)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="22,5"
                  value={e.carga}
                  onChange={(ev) => atualizar(e.id, { carga: ev.target.value })}
                  className={INPUT}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {e.marcadas.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => alternar(e.id, i)}
                  aria-label={`Série ${i + 1}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition-colors ${
                    m
                      ? "border-ember bg-ember text-ink"
                      : "border-line text-mute hover:text-bone"
                  }`}
                >
                  {m ? "✓" : i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => maisSerie(e.id)}
                className="px-2 text-xs text-ember hover:underline"
              >
                + série
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={finalizar}
          disabled={salvando}
          className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Finalizar treino"}
        </button>
        <button
          type="button"
          onClick={cancelar}
          className="text-sm text-mute hover:text-bone"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}