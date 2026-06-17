import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#e8f7f3",
        paper: "#071115",
        panel: "#0f1b22",
        line: "#223741",
        primary: "#df6d6d",
        income: "#35e2c3",
        sage: "#f28f7f",
        coral: "#df6d6d",
        blue: "#ff9b85",
        gold: "#ffc7a3"
      }
    }
  },
  plugins: []
};

export default config;
