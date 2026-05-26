import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        paper: "#f7f5ef",
        line: "#ded9cd",
        sage: "#6f8f72",
        coral: "#d96f57",
        blue: "#4776a8",
        gold: "#c99a35"
      }
    }
  },
  plugins: []
};

export default config;
