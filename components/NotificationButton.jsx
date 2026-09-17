"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPush,
  syncExistingSubscription,
  isNotificationSupported,
} from "@/lib/notifications";

export default function NotificationButton({ userId }) {
  const [status, setStatus] = useState("idle"); // idle | loading | granted | denied | unsupported | error
  const [supported, setSupported] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkExistingSubscription() {
      if (!isNotificationSupported()) {
        setSupported(false);
        setChecking(false);
        return;
      }

      if (Notification.permission === "denied") {
        setStatus("denied");
        setChecking(false);
        return;
      }

      if (userId) {
        const synced = await syncExistingSubscription(userId);
        if (synced) {
          setStatus("granted");
        }
      }

      setChecking(false);
    }

    checkExistingSubscription();
  }, [userId]);

  async function handleClick() {
    if (!userId) return;
    setStatus("loading");
    const result = await subscribeToPush(userId);

    if (result.success) {
      setStatus("granted");
    } else if (result.error === "denied") {
      setStatus("denied");
    } else {
      setStatus("error");
    }
  }

  if (!supported) return null;
  if (checking) return null;
  if (status === "granted") return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="flex items-center gap-2 rounded-full border border-ember/40 bg-ember/10 px-4 py-2 text-sm text-ember transition hover:bg-ember/20 disabled:opacity-50"
      >
        🔔 {status === "loading" ? "Ativando..." : "Ativar notificações"}
      </button>
      {status === "denied" && (
        <p className="text-xs text-white/50">
          Notificações bloqueadas. Ative nas configurações do navegador.
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-white/50">
          Não foi possível ativar agora. Tente novamente.
        </p>
      )}
    </div>
  );
}