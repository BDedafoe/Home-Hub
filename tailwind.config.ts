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
        sage: "#35e2c3",
        coral: "#ff6f61",
        blue: "#4bb7ff",
        gold: "#ffd166"
      }
    }
  },
  plugins: []
};

export default config;
