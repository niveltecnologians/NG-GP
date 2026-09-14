import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4fae1",
          100: "#e6f5c2",
          200: "#d0ec8f",
          300: "#b6df54",
          400: "#9fd12c",
          500: "#86b820",
          600: "#6b9518",
          700: "#547313",
          800: "#3f5710"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.03)",
        "card-hover": "0 8px 20px -6px rgba(107, 149, 24, 0.18)",
        panel: "0 20px 40px -12px rgba(15, 23, 42, 0.18)"
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
export default config;
