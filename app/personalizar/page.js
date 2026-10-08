"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { useAuth } from "@/components/AuthProvider";

const THEMES = [
  { key: "dark", label: "Escuro" },
  { key: "light", label: "Claro" },
  { key: "auto", label: "Automático" },
  { key: "custom", label: "Personalizado" },
];

// Temas prontos: cada um é só um par fundo + destaque (o resto se calcula sozinho)
const PRESETS = [
  { key: "papel", label: "Papel antigo", bg: "#efe6d0", ac: "#8a5a2b" },
  { key: "meianoite", label: "Meia-noite", bg: "#0b1220", ac: "#7aa7e6" },
  { key: "floresta", label: "Floresta", bg: "#0d1a14", ac: "#6fae7b" },
  { key: "bordo", label: "Bordô", bg: "#1a0b10", ac: "#cd6478" },
  { key: "oceano", label: "Oceano", bg: "#08161c", ac: "#4fb3bf" },
  { key: "noitereal", label: "Noite real", bg: "#14101f", ac: "#aa8cdc" },
  { key: "alvorada", label: "Alvorada", bg: "#f6e9e0", ac: "#b4532a" },
  { key: "nevoa", label: "Névoa", bg: "#e6ebef", ac: "#3d5a80" },
  { key: "oliveira", label: "Oliveira", bg: "#e8ecdc", ac: "#5a6b2e" },
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

// ---------- Cores por tipo ----------
const KINDS = [
  { key: "tarefa", label: "Tarefa", def: "#d9a441" },
  { key: "habito", label: "Hábito", def: "#6fae7b" },
  { key: "compromisso", label: "Compromisso", def: "#6b8fd6" },
  { key: "lembrete", label: "Lembrete", def: "#9a82c9" },
];

function defaultKinds() {
  const o = {};
  KINDS.forEach((k) => {
    o[k.key] = k.def;
  });
  return o;
}

function hexToTriplet(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(" ");
}

function applyKind(key, hex) {
  document.documentElement.style.setProperty("--k-" + key, hexToTriplet(hex));
}

function saveKinds(obj) {
  try {
    localStorage.setItem("kcolors", JSON.stringify(obj));
  } catch (e) {}
}

function resetKinds() {
  KINDS.forEach((k) => {
    document.documentElement.style.removeProperty("--k-" + k.key);
  });
  try {
    localStorage.removeItem("kcolors");
  } catch (e) {}
}

// ---------- Meus temas (salvos por você) ----------
function persistMyThemes(list) {
  try {
    localStorage.setItem("mythemes", JSON.stringify(list));
  } catch (e) {}
}

// ---------- Cores personalizadas ----------
const DEFAULT_BG = "#000000";
const DEFAULT_ACCENT = "#d9a65c";

const CUSTOM_VAR_KEYS = [
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

const LIGHT_TEXT = [242, 239, 233];
const DARK_TEXT = [30, 27, 22];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function luminance(rgb) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

// A partir do fundo e do destaque, calcula todas as cores do app
function buildCustom(bgHex, accentHex) {
  const bg = hexToRgb(bgHex);
  let ac = hexToRgb(accentHex);
  const white = [255, 255, 255];

  // Texto claro ou escuro, o que tiver mais contraste com o fundo
  const dark = contrast(bg, LIGHT_TEXT) >= contrast(bg, DARK_TEXT);
  const bone = dark ? LIGHT_TEXT : DARK_TEXT;

  const surface = dark ? mix(bg, white, 0.07) : mix(bg, white, 0.5);
  const panel = dark ? mix(bg, white, 0.04) : mix(bg, white, 0.7);
  const line = mix(bg, bone, 0.16);
  const mute = mix(bg, bone, 0.58);

  // Se o destaque ficar parecido demais com o fundo, empurra em direção ao texto
  let i = 0;
  while (contrast(ac, bg) < 3 && i < 20) {
    ac = mix(ac, bone, 0.1);
    i++;
  }

  const s = (c) => c.join(" ");
  const vars = {
    "--ink": s(bg),
    "--bone": s(bone),
    "--surface": s(surface),
    "--panel": s(panel),
    "--line": s(line),
    "--mute": s(mute),
    "--ember": s(ac),
    "--glow": s(ac),
    "--glow-a": dark ? "0.28" : "0.05",
    "--glow-b": dark ? "0.16" : "0.16",
    "--grain": "0.03",
  };
  return { dark, vars };
}

function applyCustom(bg, ac) {
  const { dark, vars } = buildCustom(bg, ac);
  const root = document.documentElement;
  Object.keys(vars).forEach((k) => root.style.setProperty(k, vars[k]));
  root.setAttribute("data-theme", dark ? "dark" : "light");
  try {
    localStorage.setItem("theme", "custom");
    localStorage.setItem("custom", JSON.stringify({ bg, ac, dark, vars }));
  } catch (e) {}
}

function clearCustom() {
  const root = document.documentElement;
  CUSTOM_VAR_KEYS.forEach((k) => root.style.removeProperty(k));
  try {
    localStorage.removeItem("custom");
  } catch (e) {}
}

function applyTheme(t) {
  clearCustom();
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

// Seletor de cor (abre o círculo cromático do navegador)
function ColorField({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer min-w-0">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-12 shrink-0 cursor-pointer rounded-full border border-line bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0"
        aria-label={label}
      />
      <span className="min-w-0">
        <span className="block text-sm text-bone">{label}</span>
        <span className="block text-xs text-mute uppercase">{value}</span>
      </span>
    </label>
  );
}

export default function PersonalizarPage() {
  const { user, loading } = useAuth();
  const [theme, setTheme] = useState("auto");
  const [accent, setAccent] = useState("ouro");
  const [titleFont, setTitleFont] = useState("fraunces");
  const [bodyFont, setBodyFont] = useState("inter");
  const [size, setSize] = useState("normal");
  const [customBg, setCustomBg] = useState(DEFAULT_BG);
  const [customAccent, setCustomAccent] = useState(DEFAULT_ACCENT);
  const [kinds, setKinds] = useState(defaultKinds());
  const [glow, setGlow] = useState(true);
  const [myThemes, setMyThemes] = useState([]);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    try {
      setTheme(localStorage.getItem("theme") || "auto");
      setAccent(localStorage.getItem("accent") || "ouro");
      setTitleFont(localStorage.getItem("font") || "fraunces");
      setBodyFont(localStorage.getItem("bodyfont") || "inter");
      setSize(localStorage.getItem("size") || "normal");
      setGlow(localStorage.getItem("glow") !== "off");
      const c = JSON.parse(localStorage.getItem("custom"));
      if (c && c.bg && c.ac) {
        setCustomBg(c.bg);
        setCustomAccent(c.ac);
      }
      const kc = JSON.parse(localStorage.getItem("kcolors"));
      if (kc) setKinds({ ...defaultKinds(), ...kc });
      const mt = JSON.parse(localStorage.getItem("mythemes"));
      if (Array.isArray(mt)) setMyThemes(mt);
    } catch (e) {}
  }, []);

  if (loading || !user) return null;

  // Escolher uma cor própria ativa o tema Personalizado
  function pickCustom(bg, ac) {
    setCustomBg(bg);
    setCustomAccent(ac);
    setTheme("custom");
    applyCustom(bg, ac);
  }

  // Clicar numa cor pronta desfaz o Personalizado (volta pro Automático)
  function leaveCustom() {
    if (theme === "custom") {
      setTheme("auto");
      applyTheme("auto");
    }
  }

  function restoreDefault() {
    setCustomBg(DEFAULT_BG);
    setCustomAccent(DEFAULT_ACCENT);
    setTheme("auto");
    applyTheme("auto");
    setAccent("ouro");
    applyAccent("ouro");
  }

  // Meus temas: salvar só quando o usuário clicar
  function saveMyTheme() {
    if (theme !== "custom") return;
    const name =
      saveName.trim() || "Meu tema " + (myThemes.length + 1);
    const item = {
      id: String(Date.now()),
      name,
      bg: customBg,
      ac: customAccent,
    };
    const next = [...myThemes, item];
    setMyThemes(next);
    persistMyThemes(next);
    setSaveName("");
  }

  function deleteMyTheme(id) {
    const next = myThemes.filter((t) => t.id !== id);
    setMyThemes(next);
    persistMyThemes(next);
  }

  // Cores por tipo
  function pickKind(key, hex) {
    const next = { ...kinds, [key]: hex };
    setKinds(next);
    applyKind(key, hex);
    saveKinds(next);
  }

  function restoreKinds() {
    setKinds(defaultKinds());
    resetKinds();
  }

  // Brilho do fundo ligado/desligado
  function toggleGlow() {
    const next = !glow;
    setGlow(next);
    const root = document.documentElement;
    try {
      if (next) {
        root.removeAttribute("data-glow");
        var old = document.getElementById("glow-off");
        if (old) old.remove();
        localStorage.removeItem("glow");
      } else {
        root.setAttribute("data-glow", "off");
        var st = document.createElement("style");
        st.id = "glow-off";
        st.textContent = ".ambient-bg{display:none !important}";
        document.head.appendChild(st);
        localStorage.setItem("glow", "off");
      }
    } catch (e) {}
  }

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
                    if (t.key === "custom") {
                      pickCustom(customBg, customAccent);
                    } else {
                      setTheme(t.key);
                      applyTheme(t.key);
                    }
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
                    leaveCustom();
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

          <div className="min-w-0 rounded-lg border border-line bg-panel p-5 md:col-span-2">
            <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
              Temas prontos
            </h2>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Temas prontos"
            >
              {PRESETS.map((p) => {
                const active =
                  theme === "custom" &&
                  customBg.toLowerCase() === p.bg &&
                  customAccent.toLowerCase() === p.ac;
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickCustom(p.bg, p.ac)}
                    className={`min-w-0 flex items-center gap-3 text-left px-4 py-3 rounded-lg border transition-colors ${
                      active
                        ? "border-ember bg-ember/10"
                        : "border-line hover:border-mute"
                    }`}
                  >
                    <span className="relative shrink-0 w-10 h-10">
                      <span
                        className="absolute inset-0 rounded-full border border-line"
                        style={{ backgroundColor: p.bg }}
                      />
                      <span
                        className="absolute right-0 bottom-0 w-5 h-5 rounded-full border-2"
                        style={{ backgroundColor: p.ac, borderColor: p.bg }}
                      />
                    </span>
                    <span className="min-w-0 text-sm text-bone truncate">
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-mute mt-3">
              Escolher um tema pronto ativa o Personalizado com essas cores. Dá
              pra ajustar as cores logo abaixo se quiser.
            </p>
          </div>

          <div className="min-w-0 rounded-lg border border-line bg-panel p-5 md:col-span-2">
            <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
              Cores personalizadas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ColorField
                label="Cor de fundo"
                value={customBg}
                onChange={(v) => pickCustom(v, customAccent)}
              />
              <ColorField
                label="Cor de destaque"
                value={customAccent}
                onChange={(v) => pickCustom(customBg, v)}
              />
            </div>
            <p className="text-xs text-mute mt-4">
              O texto, os painéis e as linhas se ajustam sozinhos pra nunca
              ficar ilegível. Escolher uma cor aqui ativa o tema Personalizado;
              clicar em Escuro, Claro, Automático ou numa cor pronta desfaz.
            </p>
            <button
              type="button"
              onClick={restoreDefault}
              className="mt-4 px-4 py-2 rounded-full text-sm border border-line text-mute hover:text-bone transition-colors"
            >
              Restaurar padrão
            </button>
          </div>

          <div className="min-w-0 rounded-lg border border-line bg-panel p-5 md:col-span-2">
            <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
              Meus temas
            </h2>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                maxLength={24}
                placeholder="Nome do tema (ex.: Meu preto e laranja)"
                disabled={theme !== "custom"}
                className="min-w-0 flex-1 px-4 py-2 rounded-full text-sm border border-line bg-transparent text-bone placeholder:text-mute focus:outline-none focus:border-ember disabled:opacity-50"
              />
              <button
                type="button"
                onClick={saveMyTheme}
                disabled={theme !== "custom"}
                className="shrink-0 px-4 py-2 rounded-full text-sm border border-ember text-ember bg-ember/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Salvar este tema
              </button>
            </div>
            <p className="text-xs text-mute mt-3">
              {theme === "custom"
                ? "Só salva se você clicar no botão. Vai guardar o fundo e o destaque que estão ativos agora."
                : "Ative o tema Personalizado (e ajuste as cores) pra poder salvar."}
            </p>

            {myThemes.length === 0 ? (
              <p className="text-sm text-mute mt-5">
                Você ainda não salvou nenhum tema.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">
                {myThemes.map((t) => {
                  const active =
                    theme === "custom" &&
                    customBg.toLowerCase() === t.bg.toLowerCase() &&
                    customAccent.toLowerCase() === t.ac.toLowerCase();
                  return (
                    <div
                      key={t.id}
                      className={`min-w-0 flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                        active ? "border-ember bg-ember/10" : "border-line"
                      }`}
                    >
                      <span className="relative shrink-0 w-10 h-10">
                        <span
                          className="absolute inset-0 rounded-full border border-line"
                          style={{ backgroundColor: t.bg }}
                        />
                        <span
                          className="absolute right-0 bottom-0 w-5 h-5 rounded-full border-2"
                          style={{ backgroundColor: t.ac, borderColor: t.bg }}
                        />
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-bone truncate">
                        {t.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => pickCustom(t.bg, t.ac)}
                        className="shrink-0 px-3 py-1 rounded-full text-xs border border-line text-mute hover:text-bone transition-colors"
                      >
                        Aplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMyTheme(t.id)}
                        aria-label={"Apagar " + t.name}
                        className="shrink-0 px-3 py-1 rounded-full text-xs border border-line text-mute hover:text-bone transition-colors"
                      >
                        Apagar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-lg border border-line bg-panel p-5 md:col-span-2">
            <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
              Cores por tipo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {KINDS.map((k) => (
                <div key={k.key} className="min-w-0 flex flex-col gap-2">
                  <ColorField
                    label={k.label}
                    value={kinds[k.key]}
                    onChange={(v) => pickKind(k.key, v)}
                  />
                  <span
                    className="self-start max-w-full truncate px-3 py-1 rounded-full text-xs border"
                    style={{
                      color: `rgb(var(--k-${k.key}))`,
                      borderColor: `color-mix(in srgb, rgb(var(--k-${k.key})) 45%, transparent)`,
                      backgroundColor: `color-mix(in srgb, rgb(var(--k-${k.key})) 14%, transparent)`,
                    }}
                  >
                    {k.label} · prévia
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-mute mt-4">
              Essas cores pintam os ícones e marcações de cada tipo. Valem em
              qualquer tema e não mudam quando você troca Escuro, Claro ou
              Personalizado.
            </p>
            <button
              type="button"
              onClick={restoreKinds}
              className="mt-4 px-4 py-2 rounded-full text-sm border border-line text-mute hover:text-bone transition-colors"
            >
              Restaurar cores dos tipos
            </button>
          </div>

          <div className="min-w-0 rounded-lg border border-line bg-panel p-5 md:col-span-2">
            <h2 className="text-xs tracking-wide text-mute uppercase mb-4">
              Brilho do fundo
            </h2>
            <div className="flex items-center justify-between gap-4">
              <p className="min-w-0 text-sm text-bone">
                {glow ? "Ligado" : "Desligado"}
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={glow}
                aria-label="Brilho do fundo"
                onClick={toggleGlow}
                className={`relative shrink-0 w-12 h-7 rounded-full border transition-colors ${
                  glow ? "border-ember bg-ember/20" : "border-line bg-transparent"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform ${
                    glow ? "translate-x-5 bg-ember" : "translate-x-0 bg-mute"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-mute mt-3">
              Liga ou desliga o brilho suave nos cantos da tela. A textura de
              grão continua.
            </p>
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