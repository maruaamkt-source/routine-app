"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { HABITOS_ESPIRITUAIS } from "@/lib/sugestoes";

export default function HabitosEspirituais({ user }) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function adicionar() {
    if (salvando) return;
    setErro("");
    setAviso("");
    setSalvando(true);

    const { data: existentes, error: erroLer } = await supabase
      .from("habits")
      .select("name")
      .eq("user_id", user.id);

    if (erroLer) {
      setSalvando(false);
      setErro("Não consegui criar os hábitos agora. Tenta de novo.");
      return;
    }

    const nomes = new Set(
      (existentes ?? []).map((h) => String(h.name).trim().toLowerCase())
    );

    const faltando = HABITOS_ESPIRITUAIS.filter(
      (h) => !nomes.has(h.nome.trim().toLowerCase())
    );
    const jaTinha = HABITOS_ESPIRITUAIS.filter((h) =>
      nomes.has(h.nome.trim().toLowerCase())
    );

    if (faltando.length > 0) {
      const { error: erroCriar } = await supabase.from("habits").insert(
        faltando.map((h) => ({
          user_id: user.id,
          name: h.nome,
          days_of_week: h.dias,
          start_time: null,
          end_time: null,
        }))
      );
      if (erroCriar) {
        setSalvando(false);
        setErro("Não consegui criar os hábitos agora. Tenta de novo.");
        return;
      }
    }

    setSalvando(false);

    if (faltando.length === 0) {
      setAviso("Você já tem todos esses hábitos. Nada foi criado.");
      return;
    }

    let msg = `Criei: ${faltando.map((h) => h.nome).join(", ")}.`;
    if (jaTinha.length > 0) {
      msg += ` Já existiam: ${jaTinha.map((h) => h.nome).join(", ")}.`;
    }
    msg += " Dá para mudar os dias na página Hábitos.";
    setAviso(msg);
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5 flex flex-col gap-3">
      <h2 className="text-xs tracking-wide text-mute uppercase">
        Hábitos espirituais
      </h2>
      <p className="text-sm text-mute">
        Adiciona na sua página Hábitos só os que você ainda não tem.
      </p>

      <ul className="flex flex-col gap-1">
        {HABITOS_ESPIRITUAIS.map((h) => (
          <li key={h.nome} className="text-sm text-bone flex justify-between gap-3">
            <span>{h.nome}</span>
            <span className="text-mute">{h.rotulo}</span>
          </li>
        ))}
      </ul>

      {erro && (
        <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
          <p className="text-sm text-bone">{erro}</p>
        </div>
      )}
      {aviso && (
        <div className="rounded-lg border-l-2 border-ember bg-panel p-4">
          <p className="text-sm text-bone">{aviso}</p>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={adicionar}
          disabled={salvando}
          className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
        >
          {salvando ? "Criando..." : "Adicionar hábitos espirituais"}
        </button>
      </div>
    </div>
  );
}