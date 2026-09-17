/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        bone: "#F2EFE9",
        surface: "#0E0D0B",
        panel: "#131210",
        line: "rgba(242,239,233,0.12)",
        mute: "#8A8A82",
        ember: "#D9A65C",
        emberSoft: "rgba(217,166,92,0.14)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};