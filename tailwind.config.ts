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
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          sunk: "var(--accent-sunk)",
          wash: "var(--accent-wash)",
        },
        pillar: {
          1: "var(--pillar-1)",
          2: "var(--pillar-2)",
          3: "var(--pillar-3)",
          4: "var(--pillar-4)",
          5: "var(--pillar-5)",
          6: "var(--pillar-6)",
          7: "var(--pillar-7)",
        },
        located: "var(--located)",
        paraphrase: "var(--paraphrase)",
        unsupported: "var(--unsupported)",
        inference: "var(--inference)",
        ungrounded: "var(--ungrounded)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-grotesque)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      spacing: {
        "s-1": "var(--s-1)",
        "s-2": "var(--s-2)",
        "s-3": "var(--s-3)",
        "s-4": "var(--s-4)",
        "s-5": "var(--s-5)",
        "s-6": "var(--s-6)",
        "s-7": "var(--s-7)",
        "s-8": "var(--s-8)",
        rail: "var(--rail-left)",
        "panel-papers": "var(--panel-papers)",
        inspector: "var(--inspector)",
        "chat-collapsed": "var(--chat-collapsed)",
        "chat-open": "var(--chat-open)",
        topbar: "var(--topbar)",
      },
      borderRadius: {
        DEFAULT: "var(--r-md)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        full: "var(--r-full)",
      },
      boxShadow: {
        "e-1": "var(--e-1)",
        "e-2": "var(--e-2)",
        "e-3": "var(--e-3)",
        "glow-accent": "var(--glow-accent)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
        canvas: "var(--dur-canvas)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        inout: "var(--ease-inout)",
        spring: "var(--ease-spring)",
      },
    },
  },
  plugins: [],
};

export default config;
