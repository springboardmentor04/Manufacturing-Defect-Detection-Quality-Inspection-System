/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3b6cf0",
          600: "#2c56d4",
          700: "#2144ab",
        },
        accent: {
          purple: "#7c3aed",
          teal: "#0d9488",
          amber: "#d97706",
          rose: "#e11d48",
        },
      },
      backgroundImage: {
        "auth-panel":
          "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.55), transparent 45%), radial-gradient(circle at 80% 0%, rgba(59,108,240,0.55), transparent 40%), radial-gradient(circle at 50% 100%, rgba(13,148,136,0.45), transparent 45%), linear-gradient(135deg, #0f172a 0%, #111c3a 60%, #0f172a 100%)",
      },
    },
  },
  plugins: [],
}