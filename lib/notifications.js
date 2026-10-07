"use client";

import { supabase } from "./supabaseClient";

export function isNotificationSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function notify(title, body) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/icon.png" });
}

// ---------- Som dentro do app aberto ----------

let audioCtx = null;

function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

// O navegador só libera som depois de um toque do usuário na página.
function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function tone(ctx, freq, start, duration) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playBeep() {
  try {
    const ctx = getAudioCtx();
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      const t = ctx.currentTime;
      tone(ctx, 880, t, 0.25);
      tone(ctx, 1175, t + 0.3, 0.35);
    }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch (e) {}
}

// ---------- Push ----------

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!isNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error("Erro ao registrar service worker:", err);
    return null;
  }
}

async function saveSubscriptionToDb(userId, subscription) {
  const subJson = subscription.toJSON();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Erro ao salvar subscription:", error);
    return false;
  }
  return true;
}

// Verifica se já existe subscription no navegador e garante que está salva no banco.
// Retorna true se existe e está sincronizada, false caso contrário.
export async function syncExistingSubscription(userId) {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const existingSub = await registration?.pushManager?.getSubscription();

    if (!existingSub) return false;

    const saved = await saveSubscriptionToDb(userId, existingSub);
    return saved;
  } catch (err) {
    console.error("Erro ao sincronizar subscription:", err);
    return false;
  }
}

export async function subscribeToPush(userId) {
  if (!isNotificationSupported()) return { error: "unsupported" };

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return { error: permission };

  const registration = await registerServiceWorker();
  if (!registration) return { error: "sw-failed" };

  try {
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const saved = await saveSubscriptionToDb(userId, subscription);
    if (!saved) return { error: "save-failed" };

    return { success: true };
  } catch (err) {
    console.error("Erro ao inscrever push:", err);
    return { error: "subscribe-failed" };
  }
}

// ---------- Lembretes com o app aberto (som) ----------

const REMINDER_MINUTES = 10;

// Fica fora da função pra não repetir o som quando a lista de tarefas muda
const notified = new Set();

export function scheduleTaskReminders(tasks, todayISO) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("pointerdown", unlockAudio, { once: true });

  const interval = setInterval(() => {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const ahead = new Date(now.getTime() + REMINDER_MINUTES * 60 * 1000);
    const aheadHHMM = ahead.toTimeString().slice(0, 5);

    tasks.forEach((task) => {
      if (task.due_date !== todayISO || !task.due_time || task.is_completed) {
        return;
      }
      const time = task.due_time.slice(0, 5);

      const nowKey = `${task.id}-now-${todayISO}-${time}`;
      if (time === hhmm && !notified.has(nowKey)) {
        notified.add(nowKey);
        playBeep();
      }

      const preKey = `${task.id}-pre-${todayISO}-${time}`;
      if (time === aheadHHMM && !notified.has(preKey)) {
        notified.add(preKey);
        playBeep();
      }
    });
  }, 15000);

  return () => {
    clearInterval(interval);
    window.removeEventListener("pointerdown", unlockAudio);
  };
}