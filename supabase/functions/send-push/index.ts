import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:seuemail@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function nowInSaoPaulo() {
  const now = new Date();
  return new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
}

Deno.serve(async (req) => {
  try {
    const sp = nowInSaoPaulo();
    const todayISO = `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, "0")}-${String(sp.getDate()).padStart(2, "0")}`;
    const hhmm = `${String(sp.getHours()).padStart(2, "0")}:${String(sp.getMinutes()).padStart(2, "0")}`;

    // Busca tarefas que vencem agora e não estão concluídas
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, user_id, title, due_time")
      .eq("due_date", todayISO)
      .eq("is_completed", false);

    if (tasksError) throw tasksError;

    const dueTasks = (tasks ?? []).filter(
      (t) => t.due_time && t.due_time.slice(0, 5) === hhmm
    );

    if (dueTasks.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    let sentCount = 0;

    for (const task of dueTasks) {
      const { data: subs, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", task.user_id);

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
          body: `Hora de: ${task.title}`,
        });

        try {
          await webpush.sendNotification(pushSubscription, payload);
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