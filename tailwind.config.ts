import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#1E3A5F",
          secondary: "#F97316",
          "accent-light": "#3B82F6",
          "accent-warm": "#FB923C",
        },
        surface: {
          DEFAULT: "#1E293B",
          hover: "#334155",
        },
        border: "#334155",
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
        progress: {
          "not-started": "#475569",
          "in-progress": "#F97316",
          covered: "#10B981",
          mastered: "#F59E0B",
        },
        status: {
          poor: "#EF4444",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
