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
          primary: '#111827', // Gray-900 (Main Text/Heading)
          secondary: '#6B7280', // Gray-500 (Subtext)
          accent: '#BEF264', // Lime-400 (Highlighter/Action) - The "Lime" from the ref image
          accentHover: '#A3E635', // Lime-500
          success: '#10B981', // Emerald-500
          danger: '#EF4444', // Red-500
          warning: '#F59E0B', // Amber-500
          background: '#F3F4F6', // Gray-100 (App Background - "Desk")
          surface: '#FFFFFF', // White (Card Background - "Paper")
          border: '#E5E7EB', // Gray-200 (Subtle Borders)
          sidebar: '#F9FAFB', // Gray-50 (Sidebar Background)
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Roboto"', '"Outfit"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 4px 0 rgba(0, 0, 0, 0.02)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'floating': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      }
    },
  },
  plugins: [],
}
