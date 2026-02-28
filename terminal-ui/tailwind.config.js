/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        terminal: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#30363d',
          amber: '#f59e0b',
          green: '#22c55e',
          red: '#ef4444',
          blue: '#58a6ff',
          muted: '#8b949e',
          text: '#e6edf3',
        },
        editorial: {
          navy: '#1e3a5f',
          gold: '#b8860b',
          cream: '#faf8f3',
          ink: '#1a1a2e',
        },
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
