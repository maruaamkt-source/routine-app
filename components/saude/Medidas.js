"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { todayISO } from "@/lib/dateUtils";
import { paraNumero, formatarNumero, diaCurto } from "@/lib/esportesUtils";
import { MEDIDAS } from "@/lib/saudeUtils";

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone focus:border-ember focus:outline-none";

function resumo(r) {
  return MEDIDAS.filter((m) => r[m.key] !== null && r[m.key] !== undefined)
    .map((m) => `${m.label} ${formatarNumero(r[m.key])} ${m.unidade}`)
    .join(" · ");
}

export default function Medidas({ user, medidas, onSalvo, onApagado }) {
  const hoje = todayISO();
  const [dia, setDia] = useState(hoje);
  const [valores, setValores] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [visiveis, setVisiveis] = useState(10);

  async function salvar() {
    setErro("");
    if (!dia) {
      setErro("Escolha a data.");
      return;
    }

    const payload = { user_id: user.id, day: dia };
    let algum = false;
    for (const m of MEDIDAS) {
      const texto = String(valores[m.key] || "").trim();
      if (texto === "") continue;
      const n = paraNumero(texto);
      if (Number.isNaN(n) || n <= 0 || n >= 1000) {
        setErro(`Valor inválido em ${m.label}. Use só números, ex.: 72,5`);
        return;
      }
      payload[m.key] = n;
      algum = true;
    }
    if (!algum) {
      setErro("Preencha pelo menos um campo.");
      return;
    }

    setSalvando(true);
    const { data, error } = await supabase
      .from("body_measurements")
      .insert(payload)
      .select()
      .single();
    setSalvando(false);

    if (error) {
      setErro("Não consegui salvar: " + error.message);
      return;
    }
    onSalvo(data);
    setValores({});
  }

  async function apagar(r) {
    if (!window.confirm("Apagar este registro?")) return;
    const { error } = await supabase
      .from("body_measurements")
      .delete()
      .eq("id", r.id)
      .eq("user_id", user.id);
    if (error) {
      setErro("Não consegui apagar: " + error.message);
      return;
    }
    onApagado(r.id);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="mb-4 text-xs uppercase tracking-wide text-mute">Novo registro</p>

        {erro && (
          <div className="mb-4 rounded-lg border-l-2 border-ember bg-surface p-3 text-sm text-bone">
            {erro}
          </div>
        )}

        <label className="mb-1 block text-xs text-mute">Data</label>
        <input
          type="date"
          value={dia}
          max={hoje}
          onChange={(e) => setDia(e.target.value)}
          className={`${INPUT} mb-4 sm:max-w-xs`}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MEDIDAS.map((m) => (
            <div key={m.key}>
              <label className="mb-1 block text-xs text-mute">
                {m.label} ({m.unidade})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={valores[m.key] || ""}
                onChange={(e) => setValores((prev) => ({ ...prev, [m.key]: e.target.value }))}
                placeholder="opcional"
                className={INPUT}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={salvando}
          onClick={salvar}
          className="mt-5 rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar registro"}
        </button>
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="mb-4 text-xs uppercase tracking-wide text-mute">Últimos registros</p>
        {medidas.length === 0 ? (
          <p className="text-sm text-mute">Nenhum registro ainda.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {medidas.slice(0, visiveis).map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-bone">{diaCurto(r.day)}</span>
                    <span className="block text-xs text-mute">{resumo(r)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => apagar(r)}
                    className="shrink-0 text-xs text-mute hover:text-bone"
                  >
                    Apagar
                  </button>
                </li>
              ))}
            </ul>
            {medidas.length > visiveis && (
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
  );
}