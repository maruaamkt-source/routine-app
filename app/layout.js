import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

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
// sistema na primeira vez) e aplica data-theme no <html>. Evita o "piscar".
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
    document.documentElement.setAttribute("data-theme", t);
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
      className={`${fraunces.variable} ${inter.variable}`}
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
      </body>
    </html>
  );
}