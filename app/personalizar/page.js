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

// Lista de fontes. Pra adicionar uma nova: declarar no layout.js + globals.css + aqui.
const FONT_GROUPS = ["Serifadas", "Sem serifa", "Destaque"];

const FONTS = [
  { key: "fraunces", label: "Fraunces", group: "Serifadas", css: "var(--font-fraunces), Georgia, serif" },
  { key: "playfair", label: "Playfair Display", group: "Serifadas", css: "var(--font-playfair), Georgia, serif" },
  { key: "cormorant", label: "Cormorant Garamond", group: "Serifadas", css: "var(--font-cormorant), Georgia, serif" },
  { key: "garamond", label: "EB Garamond", group: "Serifadas", css: "var(--font-garamond), Georgia, serif" },
  { key: "lora", label: "Lora", group: "Serifadas", css: "var(--font-lora), Georgia, serif" },
  { key: "merriweather", label: "Merriweather", group: "Serifadas", css: "var(--font-merriweather), Georgia, serif" },
  { key: "inter", label: "Inter", group: "Sem serifa", css: "var(--font-inter), system-ui, sans-serif" },
  { key: "poppins", label: "Poppins", group: "Sem serifa", css: "var(--font-poppins), system-ui, sans-serif" },
  { key: "montserrat", label: "Montserrat", group: "Sem serifa", css: "var(--font-montserrat), system-ui, sans-serif" },
  { key: "nunito", label: "Nunito", group: "Sem serifa", css: "var(--font-nunito), system-ui, sans-serif" },
  { key: "dmsans", label: "DM Sans", group: "Sem serifa", css: "var(--font-dmsans), system-ui, sans-serif" },
  { key: "cinzel", label: "Cinzel", group: "Destaque", css: "var(--font-cinzel), Georgia, serif", titleOnly: true },
];

const BODY_FONTS = FONTS.filter((f) => !f.titleOnly);

const SIZES = [
  { key: "pequeno", label: "Pequeno" },
  { key: "normal", label: "Normal" },
  { key: "grande", label: "Grande" },
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

// Aplica um atributo no <html> e guarda no localStorage
function applyAttr(attr, storageKey, value) {
  document.documentElement.setAttribute(attr, value);
  try {
    localStorage.setItem(storageKey, value);
  } catch (e) {}
}

// Cartão com a lista de fontes agrupada e com prévia
function FontPicker({ title, fonts, value, defaultKey, previewClass, previewText, onPick }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-panel p-5 md:col-span-2">
      <h2 className="text-xs tracking-wide text-mute uppercase mb-4">{title}</h2>
      {FONT_GROUPS.map((group) => {
        const list = fonts.filter((f) => f.group === group);
        if (list.length === 0) return null;
        return (
          <div key={group} className="mb-5 last:mb-0">
            <p className="text-xs text-mute mb-2">{group}</p>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
              role="radiogroup"
              aria-label={title}
            >
              {list.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={value === f.key}
                  onClick={() => onPick(f.key)}
                  className={`min-w-0 text-left px-4 py-3 rounded-lg border transition-colors ${
                    value === f.key
                      ? "border-ember bg-ember/10"
                      : "border-line hover:border-mute"
                  }`}
                >
                  <span
                    className={`block text-bone truncate ${previewClass}`}
                    style={{ fontFamily: f.css }}
                  >
                    {previewText}
                  </span>
                  <span className="block text-xs text-mute mt-1">
                    {f.label}
                    {f.key === defaultKey ? " (padrão)" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PersonalizarPage() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState("auto");
  const [accent, setAccent] = useState("ouro");
  const [titleFont, setTitleFont] = useState("fraunces");
  const [bodyFont, setBodyFont] = useState("inter");
  const [size, setSize] = useState("normal");

  useEffect(() => {
    try {
      setTheme(localStorage.getItem("theme") || "auto");
      setAccent(localStorage.getItem("accent") || "ouro");
      setTitleFont(localStorage.getItem("font") || "fraunces");
      setBodyFont(localStorage.getItem("bodyfont") || "inter");
      setSize(localStorage.getItem("size") || "normal");
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

          <FontPicker
            title="Fonte dos títulos"
            fonts={FONTS}
            value={titleFont}
            defaultKey="fraunces"
            previewClass="text-xl"
            previewText="Bom dia, sua rotina"
            onPick={(key) => {
              setTitleFont(key);
              applyAttr("data-font", "font", key);
            }}
          />

          <FontPicker
            title="Fonte do corpo"
            fonts={BODY_FONTS}
            value={bodyFont}
            defaultKey="inter"
            previewClass="text-sm"
            previewText="Organize sua rotina, um dia de cada vez."
            onPick={(key) => {
              setBodyFont(key);
              applyAttr("data-body", "bodyfont", key);
            }}
          />

          <div className="min-w-0 rounded-lg border border-line bg-panel p-5 md:col-span-2">
            <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
              Tamanho do texto
            </h2>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tamanho do texto">
              {SIZES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={size === s.key}
                  onClick={() => {
                    setSize(s.key);
                    applyAttr("data-size", "size", s.key);
                  }}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    size === s.key
                      ? "border-ember text-ember bg-ember/10"
                      : "border-line text-mute hover:text-bone"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-mute mt-3">
              O texto do app inteiro cresce ou diminui junto.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}