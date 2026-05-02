import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./types/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        danger: {
          low: "hsl(var(--danger-low))",
          moderate: "hsl(var(--danger-moderate))",
          considerable: "hsl(var(--danger-considerable))",
          high: "hsl(var(--danger-high))",
          extreme: "hsl(var(--danger-extreme))",
        },
        terrain: { bg: "hsl(var(--terrain-bg))", panel: "hsl(var(--terrain-panel))", border: "hsl(var(--terrain-border))", highlight: "hsl(var(--terrain-highlight))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        terrain: "0 20px 60px -30px rgba(15, 23, 42, 0.35)",
        panel: "0 18px 55px -32px rgba(15, 23, 42, 0.35)",
      },
      backgroundImage: {
        topo: "radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.12), transparent 36%), radial-gradient(circle at 80% 0%, rgba(251, 191, 36, 0.18), transparent 30%), linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.94))",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
