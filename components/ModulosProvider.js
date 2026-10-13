"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { TODOS } from "@/lib/modulos";

const ModulosContext = createContext({
  modulos: TODOS,
  salvarModulos: async () => ({ error: null }),
});

export function ModulosProvider({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const userId = user?.id ?? null;

  const [modulos, setModulos] = useState(TODOS);
  const [onboardingFeito, setOnboardingFeito] = useState(true);
  const [carregado, setCarregado] = useState(false);

  // Busca o perfil uma vez por usuário
  useEffect(() => {
    if (!userId) {
      setCarregado(false);
      return;
    }
    let cancelado = false;
    setCarregado(false);
    supabase
      .from("profiles")
      .select("modulos, onboarding_feito")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          // Segurança: se der erro (ex.: tabela ainda não criada), libera tudo
          setModulos(TODOS);
          setOnboardingFeito(true);
        } else if (!data) {
          // Conta nova, sem perfil: vai para o onboarding
          setModulos([]);
          setOnboardingFeito(false);
        } else {
          setModulos(data.modulos ?? []);
          setOnboardingFeito(Boolean(data.onboarding_feito));
        }
        setCarregado(true);
      });
    return () => {
      cancelado = true;
    };
  }, [userId]);

  // Conta nova: manda para a tela de boas-vindas
  useEffect(() => {
    if (loading || !userId || !carregado) return;
    if (!onboardingFeito && pathname !== "/bem-vindo") {
      router.replace("/bem-vindo");
    }
  }, [loading, userId, carregado, onboardingFeito, pathname, router]);

  const salvarModulos = useCallback(
    async (lista) => {
      if (!userId) return { error: new Error("Sem usuário logado.") };
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, modulos: lista, onboarding_feito: true });
      if (!error) {
        setModulos(lista);
        setOnboardingFeito(true);
      }
      return { error };
    },
    [userId]
  );

  // Enquanto o perfil não chega (ou está indo pro onboarding), não mostra nada
  if (userId && !carregado) return null;
  if (userId && !onboardingFeito && pathname !== "/bem-vindo") return null;

  return (
    <ModulosContext.Provider value={{ modulos, salvarModulos }}>
      {children}
    </ModulosContext.Provider>
  );
}

export function useModulos() {
  return useContext(ModulosContext);
}