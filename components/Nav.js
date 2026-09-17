"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

const LINKS = [
  { href: "/", label: "Hoje" },
  { href: "/calendar", label: "Agenda" },
  { href: "/habits", label: "Hábitos" },
  { href: "/history", label: "Histórico" },
];

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
              const active = pathname === link.href;
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

        <button
          onClick={signOut}
          className="flex items-center gap-2 text-mute hover:text-bone text-sm transition-colors"
        >
          Sair
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center border-t border-line bg-surface/95 backdrop-blur py-3 z-20">
        {LINKS.map((link) => {
          const active = pathname === link.href;
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
      </nav>
    </>
  );
}