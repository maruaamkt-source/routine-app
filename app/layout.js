import {
  Fraunces,
  Inter,
  Poppins,
  Lora,
  Playfair_Display,
  Cormorant_Garamond,
  EB_Garamond,
  Merriweather,
  Montserrat,
  Nunito,
  DM_Sans,
  Cinzel,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Watermark from "@/components/Watermark";

// Fontes originais do app (marca d'água e título da Nav usam essas)
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

// Fontes opcionais (escolhidas em Personalizar). preload: false = só baixam
// se a pessoa realmente usar, então não pesam o app.
// IMPORTANTE: o next/font exige as opções escritas por extenso em cada fonte
// (nada de spread "...", nem objeto compartilhado).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
  preload: false,
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-garamond",
  display: "swap",
  preload: false,
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-nunito",
  display: "swap",
  preload: false,
});

const dmsans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dmsans",
  display: "swap",
  preload: false,
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cinzel",
  display: "swap",
  preload: false,
});

const fontVars = [
  fraunces,
  inter,
  poppins,
  lora,
  playfair,
  cormorant,
  garamond,
  merriweather,
  montserrat,
  nunito,
  dmsans,
  cinzel,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata = {
  title: "Routine",
  description: "Organize sua rotina do dia a dia.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Routine",
    statusBarStyle: "black-translucent",
  },
};

// Roda antes da página aparecer: lê a escolha salva (ou a preferência do
// sistema na primeira vez) e aplica data-theme, data-accent, data-font,
// data-body e data-size no <html>. Evita o "piscar".
// Se o tema salvo for "custom" (Personalizado), aplica as cores guardadas.
// Também aplica as cores por tipo (kcolors), que são independentes do tema.
const themeScript = `
(function () {
  try {
    var d = document.documentElement;
    var t = localStorage.getItem("theme");
    var done = false;
    if (t === "custom") {
      var c = JSON.parse(localStorage.getItem("custom"));
      if (c && c.vars) {
        for (var k in c.vars) d.style.setProperty(k, c.vars[k]);
        d.setAttribute("data-theme", c.dark ? "dark" : "light");
        done = true;
      }
    }
    if (!done) {
      if (t !== "light" && t !== "dark") {
        t = window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
      }
      d.setAttribute("data-theme", t);
    }
    var a = localStorage.getItem("accent");
    if (a) d.setAttribute("data-accent", a);
    var f = localStorage.getItem("font");
    if (f) d.setAttribute("data-font", f);
    var b = localStorage.getItem("bodyfont");
    if (b) d.setAttribute("data-body", b);
    var s = localStorage.getItem("size");
    if (s) d.setAttribute("data-size", s);
    var kc = JSON.parse(localStorage.getItem("kcolors"));
    if (kc) {
      for (var n in kc) {
        var h = String(kc[n]).replace("#", "");
        var rgb =
          parseInt(h.slice(0, 2), 16) + " " +
          parseInt(h.slice(2, 4), 16) + " " +
          parseInt(h.slice(4, 6), 16);
        d.style.setProperty("--k-" + n, rgb);
      }
    }
  } catch (e) {}
})();
`;

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={fontVars}
      // Garante que Fraunces e Inter nunca fiquem vazias (o app caía em Times)
      style={{
        "--font-fraunces": fraunces.style.fontFamily,
        "--font-inter": inter.style.fontFamily,
      }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-ink text-bone font-sans antialiased">
        <div className="ambient-bg" />
        <div className="grain" />
        <div className="relative z-10">
          <AuthProvider>{children}</AuthProvider>
        </div>
        <Watermark />
      </body>
    </html>
  );
}