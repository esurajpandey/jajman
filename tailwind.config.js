/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          600: 'var(--color-primary-600)',
          fg: 'var(--color-primary-fg)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          fg: 'var(--color-secondary-fg)',
        },
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '24px' },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', '"Noto Sans Devanagari"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(42,35,32,0.06), 0 1px 2px rgba(42,35,32,0.04)',
        float: '0 8px 24px rgba(42,35,32,0.14)',
      },
    },
  },
  plugins: [],
};
