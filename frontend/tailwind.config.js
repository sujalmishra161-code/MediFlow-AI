/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",
        cardBg: "rgba(17, 24, 39, 0.7)",
        cardBorder: "rgba(255, 255, 255, 0.08)",
        glassText: "#E5E7EB",
        primaryGlowing: "#3B82F6",
        urgencyHigh: "#EF4444",
        urgencyMedium: "#F59E0B",
        urgencyLow: "#10B981"
      }
    },
  },
  plugins: [],
}
