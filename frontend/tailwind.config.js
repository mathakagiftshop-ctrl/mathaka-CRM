/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crm: {
          primary: '#0F172A', // Slate-900 (Main Brand/Text)
          secondary: '#64748B', // Slate-500 (Subtext)
          accent: '#0EA5E9', // Sky-500 (Interactive/Links)
          success: '#10B981', // Emerald-500
          danger: '#EF4444', // Red-500
          warning: '#F59E0B', // Amber-500
          background: '#F8FAFC', // Slate-50 (App Background)
          surface: '#FFFFFF', // White (Card Background)
          border: '#E2E8F0', // Slate-200 (Borders)
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Roboto"', '"Outfit"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
