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
        brand: {
          50:  'var(--school-50,  #F8FAFC)',
          100: 'var(--school-100, #F1F5F9)',
          200: 'var(--school-200, #E2E8F0)',
          300: 'var(--school-300, #94A3B8)',
          400: 'var(--school-400, #64748B)',
          500: 'var(--school-500, #475569)',
          600: 'var(--school-600, #334155)',
          700: 'var(--school-700, #1E293B)',
          800: 'var(--school-800, #0F172A)',
          900: 'var(--school-900, #020617)',
        },
        surface: {
          default: 'var(--surface-default)',
          muted: 'var(--surface-muted)',
          hover: 'var(--surface-hover)',
          glass: 'var(--surface-glass)',
          elevated: 'var(--surface-elevated)',
        },
        ink: {
          title: 'var(--ink-title)',
          body: 'var(--ink-body)',
          muted: 'var(--ink-muted)',
        },
        border: {
          light: 'var(--border-light)',
          focus: 'var(--border-focus)',
        },
        school: {
          DEFAULT: 'var(--school-primary)',
          secondary: 'var(--school-secondary)',
          tint: 'var(--school-tint)',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        heading: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'social-card': 'var(--shadow-social-card)',
        'social-dropdown': 'var(--shadow-social-dropdown)',
        'social-focus': '0 0 0 3px rgba(var(--school-primary-rgb, 59, 130, 246), 0.15)',
        'glow': 'var(--shadow-glow)',
        'elevated': 'var(--shadow-lg)',
      },
      borderRadius: {
        'social': 'var(--radius-social)',
        'pill': 'var(--radius-pill)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        '4xl': 'var(--radius-4xl)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out both',
        'slide-up': 'slideUp 500ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slideDown 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spring-pop': 'springPop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        springPop: {
          from: { opacity: '0', transform: 'scale(0.85) translateY(10px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce': 'cubic-bezier(0.34, 1.8, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
