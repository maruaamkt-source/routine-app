"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useModulos } from "./ModulosProvider";
import { itensDoMenu } from "@/lib/modulos";
import InstallButton from "./InstallButton";
import { supabase } from "@/lib/supabaseClient";

// Variáveis que o tema Personalizado aplica inline no <html>
const CUSTOM_VARS = [
  "--ink",
  "--bone",
  "--surface",
  "--panel",
  "--line",
  "--mute",
  "--ember",
  "--glow",
  "--glow-a",
  "--glow-b",
  "--grain",
];

const ICONS = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  agenda: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  habits: (
    <>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 15h2" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </>
  ),
  study: (
    <>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
      <path d="M22 9v6" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M6.5 6.5v11M17.5 6.5v11" />
      <path d="M3.5 9v6M20.5 9v6" />
      <path d="M6.5 12h11" />
    </>
  ),
  heart: (
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M16 8l4 4-4 4M20 12H9" />
    </>
  ),
};

function NavIcon({ name }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {ICONS[name]}
    </svg>
  );
}

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ThemeToggle({
  withLabel = false,
  className = "flex items-center gap-2 text-mute hover:text-bone text-sm transition-colors",
}) {
  const [theme, setTheme] = useState(null);

  // Lê o tema que o script do layout já aplicou no <html>
  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "dark");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    const root = document.documentElement;

    // Desfaz o tema Personalizado (vars inline + chave "custom")
    CUSTOM_VARS.forEach((v) => root.style.removeProperty(v));
    try {
      localStorage.removeItem("custom");
    } catch (e) {}

    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
    setTheme(next);
  }

  const isLight = theme === "light";
  const label = isLight ? "Tema escuro" : "Tema claro";

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className={className}
    >
      {theme === null ? (
        <span className="w-[18px] h-[18px]" />
      ) : isLight ? (
        <MoonIcon />
      ) : (
        <SunIcon />
      )}
      {withLabel && <span>{label}</span>}
    </button>
  );
}

const ITEM_BASE =
  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base transition-colors";

export default function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { modulos } = useModulos();
  const [open, setOpen] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [pendentes, setPendentes] = useState(0);

  // Admin: descobre se é admin e conta os pedidos pendentes
  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    async function checar() {
      const ad = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelado || !ad.data) return;
      setEhAdmin(true);
      const { count } = await supabase
        .from("acessos")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "pendente");
      if (!cancelado) setPendentes(count || 0);
    }
    checar();
    return () => {
      cancelado = true;
    };
  }, [user, pathname]);

  // Itens do menu: "Hoje" sempre + os módulos que a pessoa escolheu
  const links = itensDoMenu(modulos);

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Com o menu aberto: trava o scroll, esconde a marca d'água e fecha com Esc
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.setAttribute("data-menu", "open");
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.removeAttribute("data-menu");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:justify-between md:w-64 md:h-screen md:sticky md:top-0 px-8 py-10 border-r border-line">
        <div>
          {/* Título travado: sempre Fraunces/Inter, não muda com a personalização */}
          <h1
            className="tracked text-2xl text-bone mb-1"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            ROUTINE
          </h1>
          <p
            className="text-mute text-sm mb-8"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            sua rotina, no controle
          </p>

          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative pl-4 py-2 text-sm transition-colors ${
                    active ? "text-bone" : "text-mute hover:text-bone"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-0 h-full w-[2px] bg-ember rounded-full" />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <InstallButton />
          </div>
          {ehAdmin && (
            <Link
              href="/admin"
              className="text-mute hover:text-bone text-sm transition-colors"
            >
              Admin{pendentes > 0 ? ` (${pendentes})` : ""}
            </Link>
          )}
          <Link
            href="/personalizar"
            className="text-mute hover:text-bone text-sm transition-colors"
          >
            Personalizar
          </Link>
          <ThemeToggle withLabel />
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-mute hover:text-bone text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile: espaço no topo pro botão não cobrir o conteúdo */}
      <div className="md:hidden h-12" aria-hidden="true" />

      {/* Mobile: botão do menu, fixo no topo */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        className="md:hidden fixed left-4 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface/95 text-bone backdrop-blur"
      >
        <MenuIcon />
      </button>

      {/* Mobile: menu lateral */}
      <div
        className={`md:hidden fixed inset-0 z-[100] ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/70 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col justify-between overflow-y-auto border-r border-line bg-panel px-5 py-8 transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            <div className="mb-8 flex items-center justify-between px-3">
              <span
                className="tracked text-2xl text-bone"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                ROUTINE
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="text-mute hover:text-bone"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {links.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${ITEM_BASE} ${
                      active
                        ? "bg-emberSoft text-ember"
                        : "text-mute hover:text-bone"
                    }`}
                  >
                    <NavIcon name={link.icon} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            {/* Marca: ROUTINE em cima, frase embaixo */}
            <div className="mb-4 px-3">
              <p
                className="tracked text-lg text-mute"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                ROUTINE
              </p>
              <p
                className="text-sm text-mute"
                style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
              >
                sua rotina, no controle
              </p>
            </div>

            <div className="flex flex-col gap-1 border-t border-line pt-4">
              <div className="px-3">
                <InstallButton />
              </div>
              {ehAdmin && (
                <Link
                  href="/admin"
                  className={`${ITEM_BASE} ${
                    isActive(pathname, "/admin")
                      ? "bg-emberSoft text-ember"
                      : "text-mute hover:text-bone"
                  }`}
                >
                  <NavIcon name="settings" />
                  Admin{pendentes > 0 ? ` (${pendentes})` : ""}
                </Link>
              )}
              <Link
                href="/personalizar"
                className={`${ITEM_BASE} ${
                  isActive(pathname, "/personalizar")
                    ? "bg-emberSoft text-ember"
                    : "text-mute hover:text-bone"
                }`}
              >
                <NavIcon name="settings" />
                Personalizar
              </Link>
              <ThemeToggle
                withLabel
                className={`${ITEM_BASE} text-mute hover:text-bone`}
              />
              <button
                onClick={signOut}
                className={`${ITEM_BASE} text-mute hover:text-bone`}
              >
                <NavIcon name="logout" />
                Sair
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}