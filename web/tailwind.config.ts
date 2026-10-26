import type { Config } from "tailwindcss";

/**
 * Control-room palette. Colors carry meaning, borrowed from broadcast vernacular:
 *  tally  = on air / critical (the red light on a camera)
 *  cue    = attention needed (stale, pending)
 *  clear  = healthy (preview monitor green)
 *  signal = interactive / selection
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        console: "#13111b",
        deck: "#1b1826",
        panel: "#221e30",
        rule: "#2e293d",
        ink: "#ece9f5",
        dim: "#a19bb4",
        faint: "#6f6884",
        tally: "#ff3b4e",
        cue: "#ffb547",
        clear: "#3ddc97",
        signal: "#9b8cff",
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        display: ["'Barlow Condensed'", "Barlow", "system-ui", "sans-serif"],
      },
      borderRadius: { monitor: "18px" },
    },
  },
  plugins: [],
};

export default config;
