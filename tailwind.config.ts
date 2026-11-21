import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identité ECOM MARKET : terre cuite (énergie commerciale) + indigo nuit (confiance) + or (premium)
        brand: {
          50: "#FFF4ED", 100: "#FFE6D4", 200: "#FFC9A8", 300: "#FFA371", 400: "#FF7438",
          500: "#F25412", 600: "#E33B08", 700: "#BC2A09", 800: "#95230F", 900: "#781F10",
        },
        night: {
          50: "#F2F4FB", 100: "#E3E7F6", 200: "#C6CDEC", 300: "#9AA6DC", 400: "#6877C7",
          500: "#4755B3", 600: "#363F96", 700: "#2D337A", 800: "#1D2154", 900: "#11132F", 950: "#0A0B1E",
        },
        gold: { 400: "#F7C548", 500: "#E9A90C" },
        wa: { 500: "#25D366", 600: "#1DA851" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,19,47,.06), 0 4px 16px -4px rgba(17,19,47,.08)",
        lift: "0 12px 32px -8px rgba(17,19,47,.22)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { rise: "rise .5s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
