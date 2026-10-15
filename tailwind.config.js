/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        game: {
          dark: '#0d111d',
          darker: '#080a12',
          surface: '#151b2d',
          surfaceLight: '#1f2742',
          border: '#2a3556',
          lightBg: '#f4f6fb',
          lightSurface: '#ffffff',
          lightBorder: '#e2e8f0',
        },
        coin: {
          cyan: '#06b6d4',
          coral: '#f43f5e',
          magenta: '#d946ef',
          lime: '#84cc16',
          orange: '#f97316',
          yellow: '#eab308',
          blue: '#3b82f6',
          purple: '#8b5cf6',
        }
      },
      keyframes: {
        coinDrop: {
          '0%': { transform: 'translateY(-300%) scale(0.9)', opacity: '0.4' },
          '65%': { transform: 'translateY(8%) scale(1.04)', opacity: '1' },
          '85%': { transform: 'translateY(-4%) scale(0.98)' },
          '100%': { transform: 'translateY(0%) scale(1)', opacity: '1' },
        },
        winPulse: {
          '0%, 100%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))' },
          '50%': { transform: 'scale(1.12)', filter: 'drop-shadow(0 0 24px rgba(255, 255, 255, 1)) ring(4px white)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        }
      },
      animation: {
        'coin-drop': 'coinDrop 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'win-pulse': 'winPulse 1.2s infinite ease-in-out',
        'glow': 'glow 2s infinite ease-in-out',
      }
    },
  },
  plugins: [],
}
