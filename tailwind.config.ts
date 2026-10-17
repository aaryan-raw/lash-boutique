import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens: { xs: "375px", sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
    extend: {
      colors: {
        ivory: "#FAF6EE", cream: "#F3ECDD", ink: "#2A2522", muted: "#6B625B",
        sage: { DEFAULT: "#8A9A82", dark: "#566650", soft: "#E4EAE0" },
        burgundy: { DEFAULT: "#6E2233", dark: "#561a28" },
        gold: "#B89B5E", goldtext: "#7A6126", line: "#E3D9C6",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { DEFAULT: "2px", md: "4px" },
      boxShadow: { soft: "0 1px 2px rgba(42,37,34,.06), 0 6px 18px rgba(42,37,34,.06)" },
      maxWidth: { page: "80rem" },
    },
  },
  plugins: [],
};
export default config;
