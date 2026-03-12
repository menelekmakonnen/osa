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
          50: '#f0fdf5',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e', 
          600: '#16a34a', 
          900: '#14532d',
        },
        surface: {
          default: 'var(--surface-default)',
          muted: 'var(--surface-muted)',
          hover: 'var(--surface-hover)',
          glass: 'var(--surface-glass)',
        },
        ink: {
          title: 'var(--ink-title)',
          body: 'var(--ink-body)',
          muted: 'var(--ink-muted)',
        },
        border: {
          light: 'var(--border-light)',
          focus: 'var(--border-focus)',
        }
      },
      fontFamily: {
        sans: ['"Segoe UI Historic"', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        heading: ['"Segoe UI Historic"', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'social-card': 'var(--shadow-social-card)',
        'social-dropdown': 'var(--shadow-social-dropdown)',
        'social-focus': '0 0 0 2px var(--border-focus)',
      },
      borderRadius: {
        'social': '8px',
        'pill': '50px',
      }
    },
  },
  plugins: [],
}
