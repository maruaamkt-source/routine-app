"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayISO, toISODate } from "@/lib/dateUtils";
import { TIPOS, temExercicios, temKm, paraNumero } from "@/lib/esportesUtils";
import { GRUPOS } from "@/lib/gruposMusculares";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function semanaAtual() {
  const h = new Date();
  const dow = (h.getDay() + 6) % 7; // segunda = 0
  return Array.from({ length: 7 }, (_, i) =>
    toISODate(new Date(h.getFullYear(), h.getMonth(), h.getDate() - dow + i))
  );
}

function linhaVazia() {
  return { name: "", grupo: "", sets: "3", reps: "10", carga: "" };
}

const VAZIO = {
  id: null,
  name: "",
  type: "Musculação",
  minutes: "",
  km: "",
  note: "",
  weekdays: [],
  reminder_time: "",
  exercises: [linhaVazia()],
};

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone placeholder:text-mute/60 focus:border-ember focus:outline-none";
const LABEL = "mb-1 block text-xs text-mute";

const virgula = (n) => (Number(n) > 0 ? String(n).replace(".", ",") : "");

export default function PlanoSemana({
  user,
  treinos,
  planos,
  setPlanos,
  registrar,
  registrando,
  onAjustar,
  onIniciar,
  onErro,
  grupos = {},
}) {
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const hoje = todayISO();
  const semana = semanaAtual();

  const feito = (p, dia) =>
    treinos.some(
      (t) =>
        t.day === dia &&
        (t.plan_id
          ? t.plan_id === p.id
          : t.name === p.name && t.type === p.type)
    );

  // ---------- editor ----------
  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  function alternarDia(i) {
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(i)
        ? f.weekdays.filter((d) => d !== i)
        : [...f.weekdays, i].sort(),
    }));
  }

  const setExercicio = (idx, campo, valor) =>
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((e, i) => (i === idx ? { ...e, [campo]: valor } : e)),
    }));

  const addExercicio = () =>
    setForm((f) => ({ ...f, exercises: [...f.exercises, linhaVazia()] }));

  const removerExercicio = (idx) =>
    setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== idx) }));

  function abrirEdicao(p) {
    setForm({
      id: p.id,
      name: p.name,
      type: p.type,
      minutes: String(p.minutes ?? ""),
      km: p.km ? String(p.km).replace(".", ",") : "",
      note: p.note ?? "",
      weekdays: p.weekdays || [],
      reminder_time: p.reminder_time ? p.reminder_time.slice(0, 5) : "",
      exercises:
        p.exercises && p.exercises.length > 0
          ? p.exercises.map((e) => ({
              name: e.name,
              grupo: e.muscle_group || "",
              sets: String(e.sets),
              reps: String(e.reps),
              carga: virgula(e.weight_kg),
            }))
          : [linhaVazia()],
    });
  }

  async function salvar() {
    if (!form.name.trim()) return onErro("Dá um nome pro treino-modelo.");
    const min = parseInt(form.minutes, 10);
    if (!Number.isInteger(min) || min < 1)
      return onErro("Coloque os minutos do treino (pelo menos 1).");

    let kmNum = null;
    if (temKm(form.type) && form.km.trim() !== "") {
      kmNum = paraNumero(form.km);
      if (Number.isNaN(kmNum) || kmNum < 0 || kmNum > 9999)
        return onErro("Confira a distância em km.");
    }

    const lista = [];
    if (temExercicios(form.type)) {
      for (const e of form.exercises) {
        if (!e.name.trim()) continue;
        const s = parseInt(e.sets, 10);
        const r = parseInt(e.reps, 10);
        const c = e.carga.trim() === "" ? 0 : paraNumero(e.carga);
        if (!(s >= 1) || !(r >= 1) || Number.isNaN(c) || c < 0)
          return onErro(`Confira séries, reps e carga de "${e.name.trim()}".`);
        lista.push({
          name: e.name.trim(),
          muscle_group: e.grupo || null,
          sets: s,
          reps: r,
          weight_kg: c,
        });
      }
    }

    onErro("");
    setSalvando(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      type: form.type,
      minutes: min,
      km: kmNum,
      note: form.note.trim() || null,
      weekdays: form.weekdays,
      reminder_time: form.reminder_time || null,
      exercises: lista,
    };

    const query = form.id
      ? supabase.from("workout_plans").update(payload).eq("id", form.id).eq("user_id", user.id)
      : supabase.from("workout_plans").insert(payload);
    const { data, error } = await query.select().single();
    setSalvando(false);

    if (error) return onErro("Não consegui salvar o plano: " + error.message);
    setPlanos((prev) =>
      form.id ? prev.map((p) => (p.id === data.id ? data : p)) : [...prev, data]
    );
    setForm(null);
  }
    async function duplicar(p) {
    onErro("");
    const { data, error } = await supabase
      .from("workout_plans")
      .insert({
        user_id: user.id,
        name: p.name + " (cópia)",
        type: p.type,
        minutes: p.minutes,
        km: p.km,
        note: p.note,
        weekdays: [],
        reminder_time: p.reminder_time || null,
        exercises: p.exercises || [],
      })
      .select()
      .single();
    if (error) return onErro("Não consegui duplicar o modelo: " + error.message);
    setPlanos((prev) => [...prev, data]);
    abrirEdicao(data);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function apagar(p) {
    if (!window.confirm(`Apagar o modelo "${p.name}"? Os treinos já registrados continuam.`))
      return;
    const { error } = await supabase
      .from("workout_plans")
      .delete()
      .eq("id", p.id)
      .eq("user_id", user.id);
    if (error) return onErro("Não consegui apagar o plano: " + error.message);
    setPlanos((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <div className="space-y-5">
      {/* Semana */}
      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="mb-4 text-xs uppercase tracking-wide text-mute">Sua semana</p>
        <ul className="space-y-2">
          {semana.map((dia, i) => {
            const doDia = planos.filter((p) => (p.weekdays || []).includes(i));
            const ehHoje = dia === hoje;
            return (
              <li
                key={dia}
                className={`rounded-lg border bg-surface px-4 py-3 ${
                  ehHoje ? "border-ember" : "border-line"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className={`w-9 shrink-0 text-sm ${ehHoje ? "text-ember" : "text-mute"}`}>
                    {DIAS[i]}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    {doDia.length === 0 ? (
                      <span className="text-sm text-mute">Descanso</span>
                    ) : (
                      doDia.map((p) => {
                        const ok = feito(p, dia);
                        const podeMarcar = !ok && dia <= hoje;
                        const ocupado = registrando === p.id + dia;
                        return (
                          <div key={p.id} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm text-bone">
                              {p.name}
                              <span className="text-mute"> · {p.type}</span>
                            </span>
                            {ok ? (
                              <span className="shrink-0 text-xs text-ember">Feito ✓</span>
                            ) : podeMarcar ? (
                              <span className="flex shrink-0 items-center gap-3">
                                {temExercicios(p.type) && (p.exercises || []).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => onIniciar(p, dia)}
                                    className="rounded-lg border border-ember px-3 py-1 text-xs font-medium text-ember"
                                  >
                                    Iniciar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onAjustar(p, dia)}
                                  className="text-xs text-ember hover:underline"
                                >
                                  Ajustar
                                </button>
                                <button
                                  type="button"
                                  disabled={ocupado}
                                  onClick={() => registrar(p, dia)}
                                  className="rounded-lg bg-ember px-3 py-1 text-xs font-medium text-ink disabled:opacity-50"
                                >
                                  {ocupado ? "..." : "Marcar feito"}
                                </button>
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-mute">Planejado</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Lista de modelos */}
      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="mb-4 text-xs uppercase tracking-wide text-mute">Meus treinos-modelo</p>
        {planos.length === 0 ? (
          <p className="text-sm text-mute">
            Nenhum modelo ainda. Monte um treino e escolha em quais dias da semana ele acontece.
          </p>
        ) : (
          <ul className="space-y-2">
            {planos.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-bone">
                    {p.name} · {p.type}
                  </span>
                  <span className="block text-xs text-mute">
                    {(p.weekdays || []).length > 0
                      ? p.weekdays.map((d) => DIAS[d]).join(", ")
                      : "Sem dias definidos"}
                    {(p.exercises || []).length > 0 ? ` · ${p.exercises.length} exercícios` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 gap-4">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(p)}
                    className="text-xs text-ember hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicar(p)}
                    className="text-xs text-ember hover:underline"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => apagar(p)}
                    className="text-xs text-mute hover:text-bone"
                  >
                    Apagar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {!form && (
          <button
            type="button"
            onClick={() => setForm({ ...VAZIO, exercises: [linhaVazia()] })}
            className="mt-4 rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
          >
            + Novo treino-modelo
          </button>
        )}
      </div>

      {/* Editor */}
      {form && (
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="mb-4 text-xs uppercase tracking-wide text-mute">
            {form.id ? "Editar modelo" : "Novo modelo"}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Nome</label>
              <input
                className={INPUT}
                placeholder="Ex.: Treino A – peito e tríceps"
                value={form.name}
                onChange={(e) => setCampo("name", e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL}>Tipo</label>
              <select
                className={INPUT}
                value={form.type}
                onChange={(e) => setCampo("type", e.target.value)}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Minutos</label>
              <input
                className={INPUT}
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="Ex.: 45"
                value={form.minutes}
                onChange={(e) => setCampo("minutes", e.target.value)}
              />
            </div>
            {temKm(form.type) && (
              <div>
                <label className={LABEL}>Distância em km (opcional)</label>
                <input
                  className={INPUT}
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex.: 5,2"
                  value={form.km}
                  onChange={(e) => setCampo("km", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="mt-5">
            <label className={LABEL}>Horário do treino (opcional, para o lembrete)</label>
            <input
              className={INPUT + " mb-4 sm:w-40"}
              type="time"
              value={form.reminder_time}
              onChange={(e) => setCampo("reminder_time", e.target.value)}
            />
            <p className="mb-2 text-xs text-mute">Dias da semana</p>
            <div className="flex flex-wrap items-center gap-2">
              {DIAS.map((d, i) => {
                const ativo = form.weekdays.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => alternarDia(i)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      ativo
                        ? "border-ember bg-ember text-ink"
                        : "border-line text-mute hover:text-bone"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCampo("weekdays", [0, 1, 2, 3, 4, 5, 6])}
                className="px-2 text-xs text-ember hover:underline"
              >
                Todos
              </button>
            </div>
          </div>

          {temExercicios(form.type) && (
            <div className="mt-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-mute">Exercícios</p>
              <div className="space-y-3">
                {form.exercises.map((e, idx) => (
                  <div key={idx} className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <input
                        className={INPUT}
                        list="nomes-exercicios-plano"
                        placeholder="Nome do exercício"
                        value={e.name}
                        onChange={(ev) => setExercicio(idx, "name", ev.target.value)}
                        onBlur={(ev) => {
                          const nm = ev.target.value.trim().toLowerCase();
                          const canon = Object.keys(grupos).find(
                            (k) => k.toLowerCase() === nm
                          );
                          if (canon && !e.grupo) setExercicio(idx, "grupo", grupos[canon]);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removerExercicio(idx)}
                        aria-label="Remover exercício"
                        className="px-2 text-mute hover:text-bone"
                      >
                        ✕
                      </button>
                    </div>
                    <select
                      className={INPUT + " mt-2"}
                      value={e.grupo}
                      onChange={(ev) => setExercicio(idx, "grupo", ev.target.value)}
                    >
                      <option value="">Grupo muscular</option>
                      {GRUPOS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <label className={LABEL}>Séries</label>
                        <input
                          className={INPUT}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={e.sets}
                          onChange={(ev) => setExercicio(idx, "sets", ev.target.value)}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>Reps</label>
                        <input
                          className={INPUT}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={e.reps}
                          onChange={(ev) => setExercicio(idx, "reps", ev.target.value)}
                        />
                      </div>
                      <div>
                        <label className={LABEL}>Carga (kg)</label>
                        <input
                          className={INPUT}
                          type="text"
                          inputMode="decimal"
                          placeholder="22,5"
                          value={e.carga}
                          onChange={(ev) => setExercicio(idx, "carga", ev.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExercicio}
                className="mt-3 text-sm text-ember hover:underline"
              >
                + exercício
              </button>
            </div>
          )}

          <div className="mt-5">
            <label className={LABEL}>Anotação (opcional)</label>
            <textarea
              className={INPUT}
              rows={2}
              value={form.note}
              onChange={(e) => setCampo("note", e.target.value)}
            />
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              disabled={salvando}
              onClick={salvar}
              className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar modelo"}
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
      )}
    </div>
  );
}