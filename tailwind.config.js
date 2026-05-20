/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#111417",
        ink: "#f4f7f5",
        muted: "#a2aaa5",
        line: "rgba(255,255,255,0.10)",
        mint: "#7be0b8"
      },
      boxShadow: {
        briefer: "0 18px 60px rgba(0,0,0,0.36)"
      }
    }
  },
  plugins: []
}
