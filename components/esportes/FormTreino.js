"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";
import { checarRecordes } from "@/lib/recordesUtils";
import { GRUPOS } from "@/lib/gruposMusculares";
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

// Se "editando" vier preenchido (um treino da tabela workouts), o formulário vira edição.
export default function FormTreino({
  user,
  treinos,
  nomes,
  grupos = {},
  onSalvo,
  onCancelar,
  editando = null,
  modelo = null, // { plano, dia }
}) {
  const contador = useRef(1);
  function proximoId() {
    contador.current += 1;
    return contador.current;
  }
  function linhaVazia() {
    return { id: proximoId(), nome: "", grupo: "", series: "3", reps: "10", carga: "", ultima: "" };
  }

  const modoEdicao = !!editando;

const plano = modelo ? modelo.plano : null;

const [dia, setDia] = useState(
  editando ? editando.day : modelo ? modelo.dia : todayISO()
);
const [tipo, setTipo] = useState(
  editando ? editando.type : plano ? plano.type : "Musculação"
);
const [nome, setNome] = useState(
  editando ? editando.name || "" : plano ? plano.name : ""
);
const [minutos, setMinutos] = useState(
  editando ? String(editando.minutes) : plano ? String(plano.minutes) : ""
);
const [km, setKm] = useState(
  editando && editando.km
    ? String(editando.km).replace(".", ",")
    : plano && plano.km
    ? String(plano.km).replace(".", ",")
    : ""
);
const [nota, setNota] = useState(
  editando ? editando.note || "" : plano ? plano.note || "" : ""
);
const [exercicios, setExercicios] = useState(() => {
  if (plano && plano.exercises && plano.exercises.length > 0) {
    return plano.exercises.map((e) => ({
      id: proximoId(),
      nome: e.name,
      nome: e.name,
grupo: e.muscle_group || "",
      series: String(e.sets),
      reps: String(e.reps),
      carga: Number(e.weight_kg) > 0 ? String(e.weight_kg).replace(".", ",") : "",
      ultima: "",
    }));
  }
  return [{ id: 1, nome: "", grupo: "", series: "3", reps: "10", carga: "", ultima: "" }];
});
  const [antigosIds, setAntigosIds] = useState([]);
  const [carregandoEx, setCarregandoEx] = useState(
    !!editando && temExercicios(editando.type)
  );
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Na edição: busca os exercícios que o treino já tinha
  useEffect(() => {
    if (!editando || !temExercicios(editando.type)) return;
    let cancelado = false;

    async function buscar() {
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("id, name, sets, reps, weight_kg, position, muscle_group")
        .eq("workout_id", editando.id)
        .eq("user_id", user.id)
        .order("position");

      if (cancelado) return;
      if (error) {
        setErro("Não consegui carregar os exercícios: " + error.message);
        setCarregandoEx(false);
        return;
      }
      const lista = data || [];
      setAntigosIds(lista.map((e) => e.id));
      if (lista.length > 0) {
        setExercicios(
          lista.map((e) => ({
            id: proximoId(),
            nome: e.name,
            nome: e.name,
grupo: e.muscle_group || "",
            series: String(e.sets),
            reps: String(e.reps),
            carga: Number(e.weight_kg) > 0 ? String(e.weight_kg).replace(".", ",") : "",
            ultima: "",
          }))
        );
      }
      setCarregandoEx(false);
    }

    buscar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando ? editando.id : null, user.id]);

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

    const g = grupos[canonico];
    if (g) {
      setExercicios((prev) =>
        prev.map((e) => (e.id === id && !e.grupo ? { ...e, grupo: g } : e))
      );
    }

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
      .select("name, sets, reps, weight_kg, position, muscle_group")
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
        nome: e.name,
grupo: e.muscle_group || "",
        series: String(e.sets),
        reps: String(e.reps),
        carga: Number(e.weight_kg) > 0 ? String(e.weight_kg).replace(".", ",") : "",
        ultima: "",
      }))
    );
    if (!nome.trim() && anterior.name) setNome(anterior.name);
  }

  // Lê e confere os campos. Devolve null se tiver erro (e já mostra o aviso).
  function conferirCampos() {
    if (!dia) {
      setErro("Escolha a data do treino.");
      return null;
    }
    const min = parseInt(minutos, 10);
    if (!Number.isInteger(min) || min < 1) {
      setErro("Coloque os minutos do treino (pelo menos 1).");
      return null;
    }

    let kmNum = null;
    if (temKm(tipo) && km.trim() !== "") {
      kmNum = paraNumero(km);
      if (Number.isNaN(kmNum) || kmNum < 0 || kmNum > 9999) {
        setErro("Confira a distância em km.");
        return null;
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
          return null;
        }
        lista.push({
          name: ex.nome.trim(),
          sets: s,
          reps: r,
          weight_kg: c,
          muscle_group: ex.grupo || null,
          position: lista.length,
        });
      }
    }

    return { min, kmNum, lista };
  }

  async function salvarNovo() {
    const campos = conferirCampos();
    if (!campos) return;
    const { min, kmNum, lista } = campos;

    setSalvando(true);

    const prs = await checarRecordes(user.id, lista);

    const { data: treino, error: erroTreino } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        day: dia,
        type: tipo,
        name: nome.trim() || null,
        minutes: min,
        km: kmNum,
        plan_id: plano ? plano.id : null,
        note: nota.trim() || null,
      })
      .select()
      .single();

    if (erroTreino || !treino) {
      setSalvando(false);
      setErro(
        "Não consegui salvar o treino: " +
          (erroTreino ? erroTreino.message : "erro desconhecido")
      );
      return;
    }

    let inseridos = [];
    if (lista.length > 0) {
      const { data, error: erroEx } = await supabase
        .from("workout_exercises")
        .insert(lista.map((l) => ({ ...l, user_id: user.id, workout_id: treino.id })))
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
    onSalvo(treino, inseridos, prs);
  }

  async function salvarEdicao() {
    if (carregandoEx) return;
    const campos = conferirCampos();
    if (!campos) return;
    const { min, kmNum, lista } = campos;

    setSalvando(true);

    // 1) atualiza o treino
    const { data: treino, error: erroTreino } = await supabase
      .from("workouts")
      .update({
        day: dia,
        type: tipo,
        name: nome.trim() || null,
        minutes: min,
        km: temKm(tipo) ? kmNum : null,
        note: nota.trim() || null,
      })
      .eq("id", editando.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (erroTreino || !treino) {
      setSalvando(false);
      setErro(
        "Não consegui salvar as alterações: " +
          (erroTreino ? erroTreino.message : "erro desconhecido")
      );
      return;
    }

    // 2) grava os exercícios novos ANTES de apagar os antigos (se der erro, você não perde nada)
    let inseridos = [];
    if (lista.length > 0) {
      const { data, error: erroEx } = await supabase
        .from("workout_exercises")
        .insert(lista.map((l) => ({ ...l, user_id: user.id, workout_id: treino.id })))
        .select();

      if (erroEx) {
        setSalvando(false);
        setErro(
          "Salvei os dados do treino, mas não consegui salvar os exercícios. Os antigos continuam intactos. (" +
            erroEx.message +
            ")"
        );
        return;
      }
      inseridos = data || [];
    }

    // 3) agora apaga os exercícios antigos
    if (antigosIds.length > 0) {
      const { error: erroApagar } = await supabase
        .from("workout_exercises")
        .delete()
        .in("id", antigosIds)
        .eq("user_id", user.id);

      if (erroApagar) {
        setSalvando(false);
        setErro(
          "Salvei, mas não consegui apagar os exercícios antigos (podem ficar repetidos). Recarregue a página e confira. (" +
            erroApagar.message +
            ")"
        );
        return;
      }
    }

    setSalvando(false);
    onSalvo(treino, inseridos);
  }

  function salvar() {
    setErro("");
    if (modoEdicao) salvarEdicao();
    else salvarNovo();
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="mb-4 text-xs uppercase tracking-wide text-mute">
        {modoEdicao ? "Editar treino" : "Registrar treino"}
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
            {!modoEdicao && (
              <button
                type="button"
                onClick={repetirUltimo}
                className="text-xs text-ember hover:underline"
              >
                Repetir último treino
              </button>
            )}
          </div>

          <datalist id="nomes-exercicios">
            {nomes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          {carregandoEx ? (
            <p className="text-sm text-mute">Carregando exercícios...</p>
          ) : (
            <>
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
                    <select
                      value={ex.grupo}
                      onChange={(e) => atualizar(ex.id, { grupo: e.target.value })}
                      className={INPUT + " mt-2"}
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
            </>
          )}
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
          disabled={salvando || carregandoEx}
          className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          {salvando ? "Salvando..." : modoEdicao ? "Salvar alterações" : "Salvar treino"}
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