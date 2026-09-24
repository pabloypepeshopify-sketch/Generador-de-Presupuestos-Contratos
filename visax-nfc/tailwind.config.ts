import type { Config } from 'tailwindcss';

/**
 * Paleta derivada del logotipo VISAX AI:
 *  - Cian brillante (parte alta de la "V")   -> #33C6F4
 *  - Azul eléctrico (centro del degradado)   -> #3F7DFB
 *  - Índigo / violeta (base de la "V" y "X")  -> #7C5CFF
 *  - Violeta profundo (acento "AI")           -> #8B5CF6
 *  - Plata / blanco (la "K" metálica)         -> #EAF0F8
 *  - Fondos casi negros con matiz azul-violeta
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#06060B',
          soft: '#0A0A12',
          raise: '#101019',
          glass: 'rgba(18, 19, 30, 0.55)',
        },
        brand: {
          cyan: '#33C6F4',
          blue: '#3F7DFB',
          indigo: '#5A5CF5',
          violet: '#7C5CFF',
          purple: '#8B5CF6',
          deep: '#6D28D9',
          silver: '#EAF0F8',
        },
        ink: {
          DEFAULT: '#F5F7FB',
          soft: '#AEB4C6',
          faint: '#6B7086',
          line: 'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(120deg, #33C6F4 0%, #3F7DFB 42%, #7C5CFF 72%, #8B5CF6 100%)',
        'brand-gradient-soft':
          'linear-gradient(120deg, rgba(51,198,244,0.16), rgba(124,92,255,0.16))',
        'radial-glow':
          'radial-gradient(60% 60% at 50% 40%, rgba(63,125,251,0.28), transparent 70%)',
        noise: "url('/noise.svg')",
      },
      boxShadow: {
        glow: '0 0 60px -12px rgba(63,125,251,0.45)',
        'glow-violet': '0 0 70px -14px rgba(124,92,255,0.5)',
        card: '0 30px 80px -30px rgba(0,0,0,0.8)',
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      keyframes: {
        'gradient-pan': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%,100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'gradient-pan': 'gradient-pan 8s ease infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        marquee: 'marquee var(--marquee-duration, 40s) linear infinite',
        'spin-slow': 'spin-slow 22s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
