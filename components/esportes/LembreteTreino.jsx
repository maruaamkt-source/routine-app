"use client";

import { useState } from "react";
import { subscribeToPush, isNotificationSupported } from "@/lib/notifications";

const MSG = {
  unsupported:
    "Este navegador não suporta notificações. No iPhone, instale o app na tela de início.",
  denied: "A permissão de notificação está bloqueada. Libere nas configurações do navegador.",
  default: "Você não permitiu as notificações.",
  "sw-failed": "Não consegui registrar o service worker.",
  "save-failed": "Não consegui salvar a inscrição.",
  "subscribe-failed": "Não consegui ativar as notificações.",
};

export default function LembreteTreino({ userId, ativo, onAlterar }) {
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");

  async function ativar() {
    setMsg("");
    setOcupado(true);
    const r = await subscribeToPush(userId);
    if (r.success) {
      await onAlterar(true);
    } else {
      setMsg(MSG[r.error] || "Não consegui ativar o lembrete.");
    }
    setOcupado(false);
  }

  async function desativar() {
    setMsg("");
    setOcupado(true);
    await onAlterar(false);
    setOcupado(false);
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-mute">Lembrete de treino</p>
          <p className="text-sm text-bone">
            {ativo ? "Ativo: aviso no horário de cada treino do Plano" : "Receba um aviso nos dias de treino"}
          </p>
        </div>
        {ativo ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={desativar}
            className="shrink-0 text-xs text-mute hover:text-bone disabled:opacity-50"
          >
            Desativar
          </button>
        ) : (
          <button
            type="button"
            disabled={ocupado || !isNotificationSupported()}
            onClick={ativar}
            className="shrink-0 rounded-lg bg-ember px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
          >
            {ocupado ? "..." : "Ativar"}
          </button>
        )}
      </div>
      {msg && <p className="mt-3 text-xs text-bone">{msg}</p>}
    </div>
  );
}