import type { Config } from 'tailwindcss';

/**
 * Colors reference the CSS custom properties defined in src/styles/tokens.css so
 * that every color remains configurable from a single place (edit the hex there).
 *
 * We wrap each variable in `color-mix(...)` with Tailwind's `<alpha-value>`
 * placeholder so opacity modifiers (e.g. `text-text/70`, `ring-navy/20`) work
 * even though the tokens are stored as plain hex values.
 */
const alpha = (v: string) => `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: alpha('--color-navy'),
          600: alpha('--color-navy-600'),
        },
        amber: {
          DEFAULT: alpha('--color-amber'),
        },
        bg: alpha('--color-bg'),
        surface: alpha('--color-surface'),
        text: alpha('--color-text'),
        success: alpha('--color-success'),
        danger: alpha('--color-danger'),
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        hi: ['Noto Sans Devanagari', 'Inter', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
