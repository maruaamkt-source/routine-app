"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

export default function AcessoGate({ children }) {
  const { user, loading, signOut } = useAuth();
  const userId = user ? user.id : null;

  // verificando | aprovado | pendente | negado | erro
  const [estado, setEstado] = useState("verificando");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const verificar = useCallback(async () => {
    if (!userId) return;
    const [a, ad] = await Promise.all([
      supabase
        .from("acessos")
        .select("status, codigo")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);
    if (ad.data) {
      setEstado("aprovado");
      return;
    }
    if (a.error || !a.data) {
      setEstado("erro");
      return;
    }
    setCodigo(a.data.codigo);
    setEstado(a.data.status);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setEstado("verificando");
    verificar();
  }, [userId, verificar]);

  // enquanto pendente, confere a cada 8 segundos e libera sozinho
  useEffect(() => {
    if (estado !== "pendente") return;
    const id = setInterval(verificar, 8000);
    return () => clearInterval(id);
  }, [estado, verificar]);

  async function pedirDeNovo() {
    setEnviando(true);
    await supabase.rpc("pedir_de_novo");
    await verificar();
    setEnviando(false);
  }

  // sem login: deixa o AuthProvider mandar pra /login
  if (loading || !userId) return children;
  if (estado === "aprovado") return children;
  if (estado === "verificando") return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-2 font-serif text-4xl tracking-widest text-bone">
          ROUTINE
        </h1>
        <div className="mx-auto mb-8 h-px w-12 bg-ember" />

        {estado === "pendente" && (
          <div className="rounded-lg border border-line bg-panel p-6">
            <p className="mb-2 text-xs uppercase tracking-wide text-mute">
              Aguardando aprovação
            </p>
            <p className="mb-4 text-sm text-mute">
              Seu acesso precisa ser liberado. Passe este código para quem
              administra o app:
            </p>
            <p className="font-serif text-4xl tracking-widest text-ember">
              {codigo}
            </p>
            <p className="mt-4 text-xs text-mute">
              Esta tela libera sozinha quando você for aprovado.
            </p>
          </div>
        )}

        {estado === "negado" && (
          <div className="rounded-lg border-l-2 border-ember bg-panel p-6 text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-mute">
              Acesso negado
            </p>
            <p className="mb-4 text-sm text-bone">
              Seu acesso não foi liberado. Se foi engano, você pode pedir de
              novo.
            </p>
            <button
              type="button"
              onClick={pedirDeNovo}
              disabled={enviando}
              className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
            >
              {enviando ? "Enviando..." : "Pedir de novo"}
            </button>
          </div>
        )}

        {estado === "erro" && (
          <div className="rounded-lg border-l-2 border-ember bg-panel p-6 text-left">
            <p className="mb-4 text-sm text-bone">
              Não consegui verificar seu acesso agora.
            </p>
            <button
              type="button"
              onClick={verificar}
              className="rounded-lg bg-ember px-5 py-2.5 text-sm font-medium text-ink"
            >
              Tentar de novo
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={signOut}
          className="mt-6 text-sm text-mute hover:text-bone"
        >
          Sair
        </button>
      </div>
    </div>
  );
}