import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand:   { DEFAULT: "#EE0033", dark: "#C40029", muted: "rgba(238,0,51,0.10)" },
        navy:    { DEFAULT: "#1A2332", mid: "#2A3445" },
        surface: "#F5F6F8",
        line:    { DEFAULT: "#E2E5EA", dark: "#C7CCD6" },
        tx:      { dark: "#1A2332", mid: "#475067", light: "#6B7587", muted: "#98A0AF", dim: "#5A6377" },
        ok:      { DEFAULT: "#2E9E5B", muted: "rgba(46,158,91,0.12)" },
        warn:    { DEFAULT: "#E8A23D", dark: "#B9791E", muted: "rgba(232,162,61,0.16)" },
        info:    { DEFAULT: "#2D6CDF", muted: "rgba(45,108,223,0.10)" },
        violet:  "#8B5CF6",
        teal:    "#0EA5A5",
        rose:    "#D6336C",
        // shadcn CSS-var tokens
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        blink:    { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
        wave:     { "0%,100%": { transform: "scaleY(0.32)" }, "50%": { transform: "scaleY(1)" } },
        mpulse:   { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        blink:     "blink 1.2s infinite",
        wave:      "wave 0.9s ease-in-out infinite",
        mpulse:    "mpulse 1s infinite",
        "fade-up": "fade-up 0.3s ease",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
