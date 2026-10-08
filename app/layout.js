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
const opt = { subsets: ["latin"], display: "swap", preload: false };

const poppins = Poppins({ ...opt, weight: ["400", "500", "600"], variable: "--font-poppins" });
const lora = Lora({ ...opt, weight: ["400", "500", "600"], variable: "--font-lora" });
const playfair = Playfair_Display({ ...opt, weight: ["400", "500", "600"], variable: "--font-playfair" });
const cormorant = Cormorant_Garamond({ ...opt, weight: ["400", "500", "600"], variable: "--font-cormorant" });
const garamond = EB_Garamond({ ...opt, weight: ["400", "500", "600"], variable: "--font-garamond" });
const merriweather = Merriweather({ ...opt, weight: ["400", "700"], variable: "--font-merriweather" });
const montserrat = Montserrat({ ...opt, weight: ["400", "500", "600"], variable: "--font-montserrat" });
const nunito = Nunito({ ...opt, weight: ["400", "500", "600"], variable: "--font-nunito" });
const dmsans = DM_Sans({ ...opt, weight: ["400", "500", "600"], variable: "--font-dmsans" });
const cinzel = Cinzel({ ...opt, weight: ["400", "500", "600"], variable: "--font-cinzel" });

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
const themeScript = `
(function () {
  try {
    var d = document.documentElement;
    var t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
    d.setAttribute("data-theme", t);
    var a = localStorage.getItem("accent");
    if (a) d.setAttribute("data-accent", a);
    var f = localStorage.getItem("font");
    if (f) d.setAttribute("data-font", f);
    var b = localStorage.getItem("bodyfont");
    if (b) d.setAttribute("data-body", b);
    var s = localStorage.getItem("size");
    if (s) d.setAttribute("data-size", s);
  } catch (e) {}
})();
`;

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={fontVars} suppressHydrationWarning>
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