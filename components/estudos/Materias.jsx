"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const CORES = [
  "#c9a96a",
  "#6b8fd6",
  "#6fae7b",
  "#cd6478",
  "#9a82c9",
  "#4fb3bf",
  "#d9803f",
  "#8d8d8d",
];

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone placeholder:text-mute/60 focus:border-ember focus:outline-none";

function ordenar(lista) {
  return [...lista].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export default function Materias({ user, materias, setMaterias, onErro }) {
  const [form, setForm] = useState(null); // { id, name, color }
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const nome = form.name.trim();
    if (!nome) return onErro("Dá um nome pra matéria.");
    const duplicada = materias.some(
      (m) => m.id !== form.id && m.name.toLowerCase() === nome.toLowerCase()
    );
    if (duplicada) return onErro("Você já tem uma matéria com esse nome.");

    onErro("");
    setSalvando(true);
    const payload = { user_id: user.id, name: nome, color: form.color };

    const query = form.id
      ? supabase
          .from("study_subjects")
          .update({ name: nome, color: form.color })
          .eq("id", form.id)
          .eq("user_id", user.id)
      : supabase.from("study_subjects").insert(payload);
    const { data, error } = await query.select().single();
    setSalvando(false);

    if (error || !data) {
      return onErro(
        "Não consegui salvar a matéria: " + (error ? error.message : "erro desconhecido")
      );
    }
    setMaterias((prev) =>
      ordenar(form.id ? prev.map((m) => (m.id === data.id ? data : m)) : [...prev, data])
    );
    setForm(null);
  }

  async function apagar(m) {
    if (
      !window.confirm(
        `Apagar a matéria "${m.name}"? As sessões já registradas continuam, mas ficam sem matéria.`
      )
    )
      return;
    const { error } = await supabase
      .from("study_subjects")
      .delete()
      .eq("id", m.id)
      .eq("user_id", user.id);
    if (error) return onErro("Não consegui apagar a matéria: " + error.message);
    setMaterias((prev) => prev.filter((x) => x.id !== m.id));
    if (form && form.id === m.id) setForm(null);
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="mb-4 text-xs uppercase tracking-wide text-mute">Matérias</p>

      {materias.length === 0 ? (
        <p className="text-sm text-mute">
          Nenhuma matéria ainda. Crie a primeira pra começar a registrar estudos.
        </p>
      ) : (
        <ul className="space-y-2">
          {materias.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span className="truncate text-sm text-bone">{m.name}</span>
              </span>
              <span className="flex shrink-0 gap-4">
                <button
                  type="button"
                  onClick={() => setForm({ id: m.id, name: m.name, color: m.color })}
                  className="text-xs text-ember hover:underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => apagar(m)}
                  className="text-xs text-mute hover:text-bone"
                >
                  Apagar
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-mute">
            {form.id ? "Editar matéria" : "Nova matéria"}
          </p>
          <input
            type="text"
            maxLength={40}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex.: Matemática"
            className={INPUT}
          />
          <p className="mb-2 mt-4 text-xs text-mute">Cor</p>
          <div className="flex flex-wrap items-center gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className="h-8 w-8 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: form.color === c ? "rgb(var(--bone))" : "transparent",
                  transform: form.color === c ? "scale(1.1)" : "scale(1)",
                }}
              />
            ))}
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              aria-label="Outra cor"
              className="h-8 w-8 cursor-pointer rounded-full border border-line bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
            />
          </div>
          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              disabled={salvando}
              onClick={salvar}
              className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar matéria"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="text-sm text-mute hover:text-bone"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm({ id: null, name: "", color: CORES[0] })}
          className="mt-4 rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
        >
          + Nova matéria
        </button>
      )}
    </div>
  );
}