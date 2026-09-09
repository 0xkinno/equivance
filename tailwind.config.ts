import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FBFBF9",
        surface: "#FFFFFF",
        "surface-subtle": "#F5F5F2",
        border: "#E5E5DF",
        accent: {
          DEFAULT: "#18181B", // Deep slate/zinc
          cobalt: "#0052FF",  // Coinbase/Base royal blue
          amber: "#D97706",
          emerald: "#059669",
          crimson: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
