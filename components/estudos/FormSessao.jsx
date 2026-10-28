"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone placeholder:text-mute/60 focus:border-ember focus:outline-none";
const LABEL = "mb-1 block text-xs text-mute";

// Se "editando" vier preenchido (uma sessão), o formulário vira edição.
export default function FormSessao({ user, materias, editando = null, onSalvo, onCancelar }) {
  const [dia, setDia] = useState(editando ? editando.day : todayISO());
  const [materiaId, setMateriaId] = useState(
    editando ? editando.subject_id || "" : materias.length > 0 ? materias[0].id : ""
  );
  const [minutos, setMinutos] = useState(editando ? String(editando.minutes) : "");
  const [nota, setNota] = useState(editando ? editando.note || "" : "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro("");
    if (!dia) return setErro("Escolha a data.");
    const min = parseInt(minutos, 10);
    if (!Number.isInteger(min) || min < 1 || min > 1440) {
      return setErro("Coloque os minutos estudados (entre 1 e 1440).");
    }

    const campos = {
      day: dia,
      subject_id: materiaId || null,
      minutes: min,
      note: nota.trim() || null,
    };

    setSalvando(true);
    const query = editando
      ? supabase
          .from("study_sessions")
          .update(campos)
          .eq("id", editando.id)
          .eq("user_id", user.id)
      : supabase.from("study_sessions").insert({ ...campos, user_id: user.id });
    const { data, error } = await query.select().single();
    setSalvando(false);

    if (error || !data) {
      return setErro(
        "Não consegui salvar a sessão: " + (error ? error.message : "erro desconhecido")
      );
    }
    onSalvo(data);
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="mb-4 text-xs uppercase tracking-wide text-mute">
        {editando ? "Editar sessão" : "Registrar sessão"}
      </p>

      {erro && (
        <div className="mb-4 rounded-lg border-l-2 border-ember bg-surface p-3 text-sm text-bone">
          {erro}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL}>Data</label>
          <input
            type="date"
            value={dia}
            max={todayISO()}
            onChange={(e) => setDia(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
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
        <div>
          <label className={LABEL}>Minutos</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
            placeholder="Ex.: 45"
            className={INPUT}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className={LABEL}>Anotação (opcional)</label>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="O que você estudou"
          className={INPUT}
        />
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar sessão"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="text-sm text-mute hover:text-bone"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}