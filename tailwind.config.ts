import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
        },
        paper: {
          DEFAULT: "var(--paper)",
          muted: "var(--paper-muted)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          faint: "var(--ink-faint)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        pillar: {
          1: "var(--pillar-1)",
          2: "var(--pillar-2)",
          3: "var(--pillar-3)",
          4: "var(--pillar-4)",
          5: "var(--pillar-5)",
          6: "var(--pillar-6)",
        },
        located: "var(--located)",
        paraphrase: "var(--paraphrase)",
        unsupported: "var(--unsupported)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-grotesque)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
