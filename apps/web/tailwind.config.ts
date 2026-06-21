import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        "panel-3": "var(--panel-3)",
        border: "var(--border)",
        "border-light": "var(--border-light)",
        text: "var(--text)",
        "text-dim": "var(--text-dim)",
        "text-faint": "var(--text-faint)",
        up: "var(--up)",
        down: "var(--down)",
        p1: "var(--p1)",
        p2: "var(--p2)",
        cyan: "var(--cyan)",
        amber: "var(--amber)",
        purple: "var(--purple)",
        blue: "var(--blue)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans TC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
