/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        bone: "rgb(var(--bone) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        mute: "rgb(var(--mute) / <alpha-value>)",
        ember: "rgb(var(--ember) / <alpha-value>)",
        emberSoft: "rgb(var(--ember) / 0.14)",
        white: "rgb(var(--bone) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-title)", "Georgia", "serif"],
        serif: ["var(--font-title)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
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