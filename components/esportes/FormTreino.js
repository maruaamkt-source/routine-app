"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";
import {
  TIPOS,
  temExercicios,
  temKm,
  paraNumero,
  resumoExercicio,
} from "@/lib/esportesUtils";

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone placeholder:text-mute/60 focus:border-ember focus:outline-none";
const LABEL = "mb-1 block text-xs text-mute";

export default function FormTreino({ user, treinos, nomes, onSalvo, onCancelar }) {
  const contador = useRef(1);
  function proximoId() {
    contador.current += 1;
    return contador.current;
  }
  function linhaVazia() {
    return { id: proximoId(), nome: "", series: "3", reps: "10", carga: "", ultima: "" };
  }

  const [dia, setDia] = useState(todayISO());
  const [tipo, setTipo] = useState("Musculação");
  const [nome, setNome] = useState("");
  const [minutos, setMinutos] = useState("");
  const [km, setKm] = useState("");
  const [nota, setNota] = useState("");
  const [exercicios, setExercicios] = useState([
    { id: 1, nome: "", series: "3", reps: "10", carga: "", ultima: "" },
  ]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function atualizar(id, campos) {
    setExercicios((prev) => prev.map((e) => (e.id === id ? { ...e, ...campos } : e)));
  }

  function adicionarExercicio() {
    setExercicios((prev) => [...prev, linhaVazia()]);
  }

  function removerExercicio(id) {
    setExercicios((prev) => prev.filter((e) => e.id !== id));
  }

  // Ao sair do campo do nome: acerta maiúsculas/minúsculas e mostra "Da última vez"
  async function buscarUltima(id, nomeDigitado) {
    const digitado = nomeDigitado.trim();
    if (!digitado) {
      atualizar(id, { ultima: "" });
      return;
    }
    const canonico = nomes.find((n) => n.toLowerCase() === digitado.toLowerCase());
    if (!canonico) {
      atualizar(id, { ultima: "" });
      return;
    }
    if (canonico !== digitado) atualizar(id, { nome: canonico });

    const { data, error } = await supabase
      .from("workout_exercises")
      .select("sets, reps, weight_kg, created_at")
      .eq("user_id", user.id)
      .eq("name", canonico)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return;
    atualizar(id, { ultima: `Da última vez: ${resumoExercicio(data[0])}` });
  }

  async function repetirUltimo() {
    setErro("");
    // "treinos" já vem do mais novo para o mais antigo
    const anterior = treinos.find((t) => t.type === tipo);
    if (!anterior) {
      setErro("Você ainda não tem um treino desse tipo para repetir.");
      return;
    }
    const { data, error } = await supabase
      .from("workout_exercises")
      .select("name, sets, reps, weight_kg, position")
      .eq("workout_id", anterior.id)
      .eq("user_id", user.id)
      .order("position");

    if (error) {
      setErro("Não consegui buscar o último treino: " + error.message);
      return;
    }
    if (!data || data.length === 0) {
      setErro("O último treino desse tipo não tem exercícios.");
      return;
    }
    setExercicios(
      data.map((e) => ({
        id: proximoId(),
        nome: e.name,
        series: String(e.sets),
        reps: String(e.reps),
        carga: Number(e.weight_kg) > 0 ? String(e.weight_kg).replace(".", ",") : "",
        ultima: "",
      }))
    );
    if (!nome.trim() && anterior.name) setNome(anterior.name);
  }

  async function salvar() {
    setErro("");

    if (!dia) {
      setErro("Escolha a data do treino.");
      return;
    }
    const min = parseInt(minutos, 10);
    if (!Number.isInteger(min) || min < 1) {
      setErro("Coloque os minutos do treino (pelo menos 1).");
      return;
    }

    let kmNum = null;
    if (temKm(tipo) && km.trim() !== "") {
      kmNum = paraNumero(km);
      if (Number.isNaN(kmNum) || kmNum < 0 || kmNum > 9999) {
        setErro("Confira a distância em km.");
        return;
      }
    }

    const lista = [];
    if (temExercicios(tipo)) {
      for (const ex of exercicios) {
        if (!ex.nome.trim()) continue;
        const s = parseInt(ex.series, 10);
        const r = parseInt(ex.reps, 10);
        const c = ex.carga.trim() === "" ? 0 : paraNumero(ex.carga);
        if (!(s >= 1) || !(r >= 1) || Number.isNaN(c) || c < 0) {
          setErro(`Confira séries, repetições e carga de "${ex.nome.trim()}".`);
          return;
        }
        lista.push({
          name: ex.nome.trim(),
          sets: s,
          reps: r,
          weight_kg: c,
          position: lista.length,
        });
      }
    }

    setSalvando(true);

    const { data: treino, error: erroTreino } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        day: dia,
        type: tipo,
        name: nome.trim() || null,
        minutes: min,
        km: kmNum,
        note: nota.trim() || null,
      })
      .select()
      .single();

    if (erroTreino || !treino) {
      setSalvando(false);
      setErro("Não consegui salvar o treino: " + (erroTreino ? erroTreino.message : "erro desconhecido"));
      return;
    }

    let inseridos = [];
    if (lista.length > 0) {
      const { data, error: erroEx } = await supabase
        .from("workout_exercises")
        .insert(
          lista.map((l) => ({ ...l, user_id: user.id, workout_id: treino.id }))
        )
        .select();

      if (erroEx) {
        // desfaz o treino para não ficar treino sem exercícios
        await supabase.from("workouts").delete().eq("id", treino.id).eq("user_id", user.id);
        setSalvando(false);
        setErro("Não consegui salvar os exercícios: " + erroEx.message);
        return;
      }
      inseridos = data || [];
    }

    setSalvando(false);
    onSalvo(treino, inseridos);
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="mb-4 text-xs uppercase tracking-wide text-mute">Registrar treino</p>

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
          <label className={LABEL}>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={INPUT}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Nome do treino (opcional)</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Treino A – peito e tríceps"
            className={INPUT}
          />
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
        {temKm(tipo) && (
          <div>
            <label className={LABEL}>Distância em km (opcional)</label>
            <input
              type="text"
              inputMode="decimal"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="Ex.: 5,2"
              className={INPUT}
            />
          </div>
        )}
      </div>

      {temExercicios(tipo) && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-mute">Exercícios</p>
            <button
              type="button"
              onClick={repetirUltimo}
              className="text-xs text-ember hover:underline"
            >
              Repetir último treino
            </button>
          </div>

          <datalist id="nomes-exercicios">
            {nomes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          <div className="space-y-3">
            {exercicios.map((ex) => (
              <div key={ex.id} className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    list="nomes-exercicios"
                    value={ex.nome}
                    onChange={(e) => atualizar(ex.id, { nome: e.target.value, ultima: "" })}
                    onBlur={(e) => buscarUltima(ex.id, e.target.value)}
                    placeholder="Nome do exercício"
                    className={INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => removerExercicio(ex.id)}
                    aria-label="Remover exercício"
                    className="px-2 text-mute hover:text-bone"
                  >
                    ✕
                  </button>
                </div>
                {ex.ultima && <p className="mt-1.5 text-xs text-ember">{ex.ultima}</p>}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className={LABEL}>Séries</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={ex.series}
                      onChange={(e) => atualizar(ex.id, { series: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={ex.reps}
                      onChange={(e) => atualizar(ex.id, { reps: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Carga (kg)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ex.carga}
                      onChange={(e) => atualizar(ex.id, { carga: e.target.value })}
                      placeholder="22,5"
                      className={INPUT}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={adicionarExercicio}
            className="mt-3 text-sm text-ember hover:underline"
          >
            + exercício
          </button>
        </div>
      )}

      <div className="mt-5">
        <label className={LABEL}>Anotação (opcional)</label>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
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
          {salvando ? "Salvando..." : "Salvar treino"}
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