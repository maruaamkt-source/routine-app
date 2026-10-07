"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const LINKS = [
  { href: "/", label: "Hoje" },
  { href: "/calendar", label: "Agenda" },
  { href: "/calendario", label: "Calendário" },
  { href: "/habits", label: "Hábitos" },
  { href: "/history", label: "Histórico" },
];

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

function ThemeToggle({ withLabel = false }) {
  const [theme, setTheme] = useState(null);

  // Lê o tema que o script do layout já aplicou no <html>
  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "dark");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
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
      className="flex items-center gap-2 text-mute hover:text-bone text-sm transition-colors"
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

export default function Nav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:justify-between md:w-64 md:h-screen md:sticky md:top-0 px-8 py-10 border-r border-line">
        <div>
          <h1 className="tracked text-2xl font-serif text-bone mb-1">
            ROUTINE
          </h1>
          <p className="text-mute text-sm mb-8">sua rotina, no controle</p>

          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => {
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
          <ThemeToggle withLabel />
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-mute hover:text-bone text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center border-t border-line bg-surface/95 backdrop-blur py-3 z-20">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs ${active ? "text-ember" : "text-mute"}`}
            >
              {link.label}
            </Link>
          );
        })}
        <ThemeToggle />
      </nav>
    </>
  );
}