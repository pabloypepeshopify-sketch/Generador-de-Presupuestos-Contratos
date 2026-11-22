import type { Config } from 'tailwindcss';

/**
 * Tailwind lee TODOS los valores de styles/tokens.css (variables CSS).
 * Para cambiar la identidad, toca los tokens, no este archivo.
 */
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './config/**/*.{ts,tsx}', './content/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: rgb('--c-bg'),
          soft: rgb('--c-bg-soft'),
          raise: rgb('--c-bg-raise'),
        },
        brand: {
          cyan: rgb('--c-brand-cyan'),
          blue: rgb('--c-brand-blue'),
          indigo: rgb('--c-brand-indigo'),
          violet: rgb('--c-brand-violet'),
          purple: rgb('--c-brand-purple'),
          deep: rgb('--c-brand-deep'),
          silver: rgb('--c-brand-silver'),
        },
        ink: {
          DEFAULT: rgb('--c-ink'),
          soft: rgb('--c-ink-soft'),
          faint: rgb('--c-ink-faint'),
          line: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        accent: rgb('--c-accent'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'card-sm': 'var(--radius-sm)',
        card: 'var(--radius)',
        'card-lg': 'var(--radius-lg)',
      },
      backgroundImage: {
        'brand-gradient': 'var(--brand-gradient)',
        'brand-gradient-soft': 'var(--brand-gradient-soft)',
        noise: "url('/noise.svg')",
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        glow: 'var(--shadow-glow)',
        'glow-violet': 'var(--shadow-glow-violet)',
      },
      transitionTimingFunction: {
        brand: 'var(--ease-brand)',
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
    },
  },
  plugins: [],
};

export default config;
