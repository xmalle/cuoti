import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#EFEEE7',
        card: '#FBFAF6',
        'math-accent': '#B8472F',
        'major-accent': '#3E7470',
        'ink': {
          DEFAULT: '#2B2A28',
          soft: '#5C5A55',
          muted: '#8A8780',
        },
        'line': '#E2E0D8',
        'success': '#3E7470',
        'danger': '#B8472F',
        'warning': '#C2861B',
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(43, 42, 40, 0.06), 0 1px 2px rgba(43, 42, 40, 0.04)',
        'card-hover': '0 4px 12px rgba(43, 42, 40, 0.08), 0 2px 4px rgba(43, 42, 40, 0.06)',
        nav: '0 -1px 8px rgba(43, 42, 40, 0.06)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        app: '480px',
      },
      animation: {
        'slide-down': 'slideDown 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
