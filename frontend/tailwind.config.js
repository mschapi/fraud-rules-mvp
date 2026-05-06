/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#667085",
        line: "#e6e8ee",
        panel: "#ffffff",
        canvas: "#f7f7f8",
        accent: "#820020",
        electric: "#b22136",
      },
    },
  },
  plugins: [],
};
