import type { Config } from "tailwindcss";
import tokens from "../../design/tokens.json";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        tertiary: tokens.colors.tertiary,
        background: tokens.colors.background,
        surface: tokens.colors.surface,
        neutral: tokens.colors.neutral,
        text: tokens.colors.text,
      },
      fontFamily: {
        sans: ["var(--font-manrope)", ...tokens.typography.fontFamily.base.split(", ")],
      },
      borderRadius: {
        base: tokens.radius.base,
      },
      boxShadow: {
        soft: tokens.shadows.soft,
      },
    },
  },
  plugins: [],
};

export default config;
