import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import tokens from "../../design/tokens.json";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // ── Design tokens (source of truth) ──────────────────────────
      colors: {
        // Raw token values — para compatibilidad con código existente
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        tertiary: tokens.colors.tertiary,
        neutral: tokens.colors.neutral,

        // CSS-variable-based tokens — para shadcn/ui components
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Semantic custom tokens
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-manrope)",
          ...tokens.typography.fontFamily.base.split(", "),
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        base: tokens.radius.base,
      },
      boxShadow: {
        soft: tokens.shadows.soft,
      },
    },
  },
  plugins: [animate],
};

export default config;
