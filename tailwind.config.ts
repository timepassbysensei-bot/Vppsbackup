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
          900: alpha('--color-navy-900'),
        },
        amber: {
          DEFAULT: alpha('--color-amber'),
          300: alpha('--color-amber-300'),
          700: alpha('--color-amber-700'),
        },
        teal: {
          DEFAULT: alpha('--color-teal'),
          700: alpha('--color-teal-700'),
        },
        sky: alpha('--color-sky'),
        bg: alpha('--color-bg'),
        surface: alpha('--color-surface'),
        'surface-2': alpha('--color-surface-2'),
        text: alpha('--color-text'),
        muted: alpha('--color-muted'),
        success: alpha('--color-success'),
        danger: alpha('--color-danger'),
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        glow: 'var(--shadow-glow)',
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
