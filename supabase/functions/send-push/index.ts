import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { QUOTES } from "./quotes.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:seuemail@example.com";

const REMINDER_MINUTES = 10; // quantos minutos antes avisar
const VERSE_TIME = "07:00"; // hora do versículo do dia (horário de São Paulo)

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function nowInSaoPaulo() {
  const now = new Date();
  return new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toHHMM(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Mesma regra do app (getQuoteForDate): dia do ano % tamanho da lista
function quoteForDate(d: Date) {
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

// Envia uma notificação pra uma inscrição. Retorna true se enviou.
async function sendOne(sub: any, payload: string, ttl: number, tag: string) {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };
  try {
    await webpush.sendNotification(pushSubscription, payload, {
      TTL: ttl,
      urgency: "high",
    });
    return true;
  } catch (err: any) {
    // Se a subscription expirou/foi revogada, remove do banco
    if (err.statusCode === 404 || err.statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    } else {
      console.error(
        `[send-push] ERRO ao enviar ${tag}: status=${err.statusCode} corpo=${err.body}`
      );
    }
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const sp = nowInSaoPaulo();
    const todayISO = toISO(sp);
    const hhmm = toHHMM(sp);

    // Momento do aviso antecipado (agora + 10 min, pode cair no dia seguinte)
    const ahead = new Date(sp.getTime() + REMINDER_MINUTES * 60 * 1000);
    const aheadISO = toISO(ahead);
    const aheadHHMM = toHHMM(ahead);

    const dates = Array.from(new Set([todayISO, aheadISO]));

    // Busca tarefas não concluídas de hoje (e de amanhã, se a janela virar o dia)
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, user_id, title, due_date, due_time")
      .in("due_date", dates)
      .eq("is_completed", false);

    if (tasksError) throw tasksError;

    const notices: { task: any; body: string; tag: string }[] = [];

    for (const t of tasks ?? []) {
      if (!t.due_time) continue;
      const time = t.due_time.slice(0, 5);

      if (t.due_date === todayISO && time === hhmm) {
        notices.push({
          task: t,
          body: `Hora de: ${t.title}`,
          tag: `task-${t.id}-now`,
        });
      }
      if (t.due_date === aheadISO && time === aheadHHMM) {
        notices.push({
          task: t,
          body: `Daqui a ${REMINDER_MINUTES} min: ${t.title}`,
          tag: `task-${t.id}-pre`,
        });
      }
    }

    let sentCount = 0;

    // Avisos de tarefas
    for (const notice of notices) {
      const { data: subs, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", notice.task.user_id);

      if (subsError || !subs) {
        console.error("[send-push] erro ao buscar inscrições:", subsError);
        continue;
      }

      const payload = JSON.stringify({
        title: "Routine",
        body: notice.body,
        tag: notice.tag,
      });

      for (const sub of subs) {
        if (await sendOne(sub, payload, 60, notice.tag)) sentCount++;
      }
    }

    // Versículo do dia (uma vez por dia, na hora configurada)
    if (hhmm === VERSE_TIME) {
      const q = quoteForDate(sp);
      const verseTag = `verse-${todayISO}`;
      const payload = JSON.stringify({
        title: "Versículo do dia",
        body: `“${q.text}” — ${q.ref}`,
        tag: verseTag,
      });

      const { data: allSubs, error: allError } = await supabase
        .from("push_subscriptions")
        .select("*");

      if (allError || !allSubs) {
        console.error("[send-push] erro ao buscar inscrições do versículo:", allError);
      } else {
        for (const sub of allSubs) {
          if (await sendOne(sub, payload, 3600, verseTag)) sentCount++;
        }
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});