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
          purple: '#6D28D9', // Deep violet
          highlight: '#8B5CF6', // Lighter violet
          green: '#4ADE80',  // Bright green
          dark: '#111827',   // Dark card background
          background: '#F3F4F6', // Light gray background
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'soft': '0 10px 40px -10px rgba(0,0,0,0.08)',
        'glow-purple': '0 0 20px -5px rgba(109, 40, 217, 0.5)',
        'glow-green': '0 0 20px -5px rgba(74, 222, 128, 0.5)',
      }
    },
  },
  plugins: [],
}
