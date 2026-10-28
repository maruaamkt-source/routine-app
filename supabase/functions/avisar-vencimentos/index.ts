import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:seuemail@example.com";

const TIPO = "vencimentos";
const MAX_NOMES = 3; // quantos gastos aparecem por nome no aviso

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type Item = { nome: string; valor: number };

const pad = (n: number) => String(n).padStart(2, "0");

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function primeiroDiaDoMes(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

// "Agora" no horário de São Paulo (mesmo truque do send-push)
function nowInSaoPaulo() {
  const now = new Date();
  return new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
}

// O gasto vence nessa data? Se o dia não existe no mês (ex.: 31 em abril),
// vale o último dia do mês (mesma regra da tela Hoje).
function vence(diaVenc: number, alvo: Date) {
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  return Math.min(diaVenc, ultimo) === alvo.getDate();
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function listar(itens: Item[]) {
  const nomes = itens
    .slice(0, MAX_NOMES)
    .map((i) => `${i.nome} (${brl(i.valor)})`);
  const resto = itens.length - MAX_NOMES;
  return nomes.join(", ") + (resto > 0 ? ` e mais ${resto}` : "");
}

function montarCorpo(v: { hoje: Item[]; amanha: Item[] }) {
  const partes: string[] = [];
  if (v.hoje.length > 0) partes.push(`Hoje: ${listar(v.hoje)}.`);
  if (v.amanha.length > 0) partes.push(`Amanhã: ${listar(v.amanha)}.`);
  return partes.join(" ");
}

// Envia pra uma inscrição. Se ela expirou (404/410), apaga do banco.
async function enviar(sub: any, payload: string) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 43200, urgency: "normal" }
    );
    return true;
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    } else {
      console.error(
        `[avisar-vencimentos] ERRO ao enviar: status=${err.statusCode} corpo=${err.body}`
      );
    }
    return false;
  }
}

Deno.serve(async (req) => {
  // Só aceita chamadas com a chave de serviço (a rotina agendada usa ela)
  if (req.headers.get("authorization") !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
    });
  }

  try {
    const url = new URL(req.url);
    const dry = url.searchParams.get("dry") === "1"; // só mostra, não envia nem registra
    const forcar = url.searchParams.get("forcar") === "1"; // ignora o "já avisei hoje"

    const sp = nowInSaoPaulo();
    const hoje = new Date(sp.getFullYear(), sp.getMonth(), sp.getDate());
    const amanha = new Date(sp.getFullYear(), sp.getMonth(), sp.getDate() + 1);
    const hojeISO = toISO(hoje);
    const meses = Array.from(
      new Set([primeiroDiaDoMes(hoje), primeiroDiaDoMes(amanha)])
    );

    const { data: fixos, error: erroFixos } = await supabase
      .from("fixed_expenses")
      .select("id, user_id, name, amount, due_day")
      .not("due_day", "is", null);
    if (erroFixos) throw erroFixos;

    const { data: pagos, error: erroPagos } = await supabase
      .from("fixed_payments")
      .select("fixed_expense_id, ref_month")
      .in("ref_month", meses);
    if (erroPagos) throw erroPagos;

    const pagosSet = new Set(
      (pagos ?? []).map((p: any) => `${p.fixed_expense_id}|${p.ref_month}`)
    );

    // Agrupa por usuário o que vence hoje e amanhã e ainda não foi pago
    const porUsuario = new Map<string, { hoje: Item[]; amanha: Item[] }>();

    for (const f of fixos ?? []) {
      const alvos = [
        { data: hoje, grupo: "hoje" as const },
        { data: amanha, grupo: "amanha" as const },
      ];
      for (const a of alvos) {
        if (!vence(f.due_day, a.data)) continue;
        if (pagosSet.has(`${f.id}|${primeiroDiaDoMes(a.data)}`)) continue;

        if (!porUsuario.has(f.user_id)) {
          porUsuario.set(f.user_id, { hoje: [], amanha: [] });
        }
        porUsuario.get(f.user_id)![a.grupo].push({
          nome: f.name,
          valor: Number(f.amount),
        });
      }
    }

    // Quem já foi avisado hoje
    const usuarios = Array.from(porUsuario.keys());
    let jaAvisados = new Set<string>();
    if (!forcar && usuarios.length > 0) {
      const { data: avisos, error: erroAvisos } = await supabase
        .from("push_avisos")
        .select("user_id")
        .eq("aviso_date", hojeISO)
        .eq("tipo", TIPO)
        .in("user_id", usuarios);
      if (erroAvisos) throw erroAvisos;
      jaAvisados = new Set((avisos ?? []).map((r: any) => r.user_id));
    }

    const resultado: any[] = [];
    let enviados = 0;

    for (const [userId, v] of porUsuario) {
      if (jaAvisados.has(userId)) {
        resultado.push({ userId, status: "ja-avisado" });
        continue;
      }

      const body = montarCorpo(v);

      if (dry) {
        resultado.push({ userId, status: "dry", body });
        continue;
      }

      const { data: subs, error: erroSubs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (erroSubs || !subs || subs.length === 0) {
        resultado.push({ userId, status: "sem-assinatura" });
        continue;
      }

      // Reserva o aviso do dia ANTES de enviar (se a rotina rodar 2x, a 2ª é barrada)
      if (!forcar) {
        const { error: erroReserva } = await supabase
          .from("push_avisos")
          .insert({ user_id: userId, aviso_date: hojeISO, tipo: TIPO });
        if (erroReserva) {
          if (erroReserva.code !== "23505") {
            console.error("[avisar-vencimentos] erro ao registrar aviso:", erroReserva);
          }
          resultado.push({
            userId,
            status: erroReserva.code === "23505" ? "ja-avisado" : "erro-registro",
          });
          continue;
        }
      }

      const payload = JSON.stringify({
        title: "Vencimentos",
        body,
        url: "/",
        tag: `vencimentos-${hojeISO}`,
      });

      let algumEnviado = false;
      for (const sub of subs) {
        if (await enviar(sub, payload)) {
          algumEnviado = true;
          enviados++;
        }
      }

      // Se nada chegou a sair, libera o registro pra tentar de novo depois
      if (!algumEnviado && !forcar) {
        await supabase
          .from("push_avisos")
          .delete()
          .eq("user_id", userId)
          .eq("aviso_date", hojeISO)
          .eq("tipo", TIPO);
      }

      resultado.push({ userId, status: algumEnviado ? "enviado" : "falhou" });
    }

    return new Response(
      JSON.stringify({ data: hojeISO, dry, enviados, resultado }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
});