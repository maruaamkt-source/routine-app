"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";

const THEMES = [
  { key: "dark", label: "Escuro" },
  { key: "light", label: "Claro" },
  { key: "auto", label: "Automático" },
];

const ACCENTS = [
  { key: "ouro", label: "Dourado", color: "rgb(217 166 92)" },
  { key: "azul", label: "Azul", color: "rgb(107 160 230)" },
  { key: "verde", label: "Verde", color: "rgb(111 174 123)" },
  { key: "vinho", label: "Vinho", color: "rgb(205 100 120)" },
  { key: "roxo", label: "Roxo", color: "rgb(170 140 220)" },
];

function applyTheme(t) {
  let real = t;
  if (t === "auto") {
    real = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  document.documentElement.setAttribute("data-theme", real);
  try {
    localStorage.setItem("theme", t);
  } catch (e) {}
}

function applyAccent(a) {
  document.documentElement.setAttribute("data-accent", a);
  try {
    localStorage.setItem("accent", a);
  } catch (e) {}
}

export default function PersonalizarPage() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState("auto");
  const [accent, setAccent] = useState("ouro");

  useEffect(() => {
    try {
      setTheme(localStorage.getItem("theme") || "auto");
      setAccent(localStorage.getItem("accent") || "ouro");
    } catch (e) {}
  }, []);

  if (loading || !user) return null;

  return (
    <div className="md:flex">
      <Nav />
      <main className="flex-1 min-w-0 px-6 py-10 md:px-12 md:py-14 pb-24 md:pb-14">
        <h1 className="font-serif text-3xl md:text-4xl text-bone mb-1">
          Personalizar
        </h1>
        <p className="text-sm text-mute mb-8">
          Deixe o Routine com a sua cara. A escolha fica salva neste aparelho.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-w-0 rounded-lg border border-line bg-panel p-5">
            <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
              Tema
            </h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tema">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={theme === t.key}
                  onClick={() => {
                    setTheme(t.key);
                    applyTheme(t.key);
                  }}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    theme === t.key
                      ? "border-ember text-ember bg-ember/10"
                      : "border-line text-mute hover:text-bone"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-mute mt-3">
              Automático segue o tema do seu celular ou computador.
            </p>
          </div>

          <div className="min-w-0 rounded-lg border border-line bg-panel p-5">
            <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
              Cor de destaque
            </h2>
            <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Cor de destaque">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  role="radio"
                  aria-checked={accent === a.key}
                  aria-label={a.label}
                  onClick={() => {
                    setAccent(a.key);
                    applyAccent(a.key);
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <span
                    className="w-10 h-10 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: a.color,
                      borderColor:
                        accent === a.key ? "rgb(var(--bone))" : "transparent",
                      transform: accent === a.key ? "scale(1.1)" : "scale(1)",
                    }}
                  />
                  <span
                    className={`text-xs ${
                      accent === a.key ? "text-bone" : "text-mute"
                    }`}
                  >
                    {a.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}