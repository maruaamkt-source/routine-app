import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:seuemail@example.com";

const JANELA_MIN = 5; // tolera atraso do cron; o push_avisos impede repetir

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const pad = (n: number) => String(n).padStart(2, "0");

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowInSaoPaulo() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function minutos(hhmm: string) {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

async function enviar(sub: any, payload: string) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 3600, urgency: "high" }
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    } else {
      console.error(
        `[avisar-treino] ERRO ao enviar: status=${err.statusCode} corpo=${err.body}`
      );
    }
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const dry = url.searchParams.get("dry") === "1";
    const forcar = url.searchParams.get("forcar") === "1";

    const sp = nowInSaoPaulo();
    const hojeISO = toISO(sp);
    const idx = (sp.getDay() + 6) % 7; // segunda = 0
    const agoraMin = sp.getHours() * 60 + sp.getMinutes();

    const { data: configs, error: erroCfg } = await supabase
      .from("health_settings")
      .select("user_id")
      .eq("lembrete_treino", true);
    if (erroCfg) throw erroCfg;

    const ids = (configs ?? []).map((c: any) => c.user_id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ data: hojeISO, dry, enviados: 0, resultado: [] }), {
        status: 200,
      });
    }

    const { data: planos, error: erroPlanos } = await supabase
      .from("workout_plans")
      .select("id, user_id, name, type, weekdays, reminder_time")
      .in("user_id", ids)
      .not("reminder_time", "is", null);
    if (erroPlanos) throw erroPlanos;

    // Modelos de hoje, com horário dentro da janela
    const candidatos = (planos ?? []).filter((p: any) => {
      if (!(p.weekdays ?? []).includes(idx)) return false;
      const diff = agoraMin - minutos(p.reminder_time);
      return diff >= 0 && diff < JANELA_MIN;
    });

    if (candidatos.length === 0) {
      return new Response(JSON.stringify({ data: hojeISO, dry, enviados: 0, resultado: [] }), {
        status: 200,
      });
    }

    const { data: feitos, error: erroFeitos } = await supabase
      .from("workouts")
      .select("user_id, name, type, plan_id")
      .in("user_id", ids)
      .eq("day", hojeISO);
    if (erroFeitos) throw erroFeitos;

    const resultado: any[] = [];
    let enviados = 0;

    for (const p of candidatos) {
      const jaFeito = (feitos ?? []).some(
        (t: any) =>
          t.user_id === p.user_id &&
          (t.plan_id ? t.plan_id === p.id : t.name === p.name && t.type === p.type)
      );
      if (jaFeito) {
        resultado.push({ plano: p.name, status: "ja-feito" });
        continue;
      }

      const tipo = `treino-${p.id}`;
      const body = `Hora do treino: ${p.name}.`;

      if (dry) {
        resultado.push({ plano: p.name, status: "dry", body });
        continue;
      }

      const { data: subs, error: erroSubs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", p.user_id);

      if (erroSubs || !subs || subs.length === 0) {
        resultado.push({ plano: p.name, status: "sem-assinatura" });
        continue;
      }

      if (!forcar) {
        const { error: erroReserva } = await supabase
          .from("push_avisos")
          .insert({ user_id: p.user_id, aviso_date: hojeISO, tipo });
        if (erroReserva) {
          if (erroReserva.code !== "23505") {
            console.error("[avisar-treino] erro ao registrar aviso:", erroReserva);
          }
          resultado.push({
            plano: p.name,
            status: erroReserva.code === "23505" ? "ja-avisado" : "erro-registro",
          });
          continue;
        }
      }

      const payload = JSON.stringify({
        title: "Treino de hoje",
        body,
        url: "/esportes",
        tag: `treino-${p.id}-${hojeISO}`,
      });

      let algum = false;
      for (const sub of subs) {
        if (await enviar(sub, payload)) {
          algum = true;
          enviados++;
        }
      }

      if (!algum && !forcar) {
        await supabase
          .from("push_avisos")
          .delete()
          .eq("user_id", p.user_id)
          .eq("aviso_date", hojeISO)
          .eq("tipo", tipo);
      }

      resultado.push({ plano: p.name, status: algum ? "enviado" : "falhou" });
    }

    return new Response(JSON.stringify({ data: hojeISO, dry, enviados, resultado }), {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});