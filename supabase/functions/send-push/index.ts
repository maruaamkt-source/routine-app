import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:seuemail@example.com";

const REMINDER_MINUTES = 10; // quantos minutos antes avisar

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

    if (notices.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    let sentCount = 0;

    for (const notice of notices) {
      const { data: subs, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", notice.task.user_id);

      if (subsError || !subs) continue;

      for (const sub of subs) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const payload = JSON.stringify({
          title: "Routine",
          body: notice.body,
          tag: notice.tag,
        });

        try {
          await webpush.sendNotification(pushSubscription, payload, {
            TTL: 60,
            urgency: "high",
          });
          sentCount++;
        } catch (err) {
          // Se a subscription expirou/foi revogada, remove do banco
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            console.error("Erro ao enviar push:", err);
          }
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