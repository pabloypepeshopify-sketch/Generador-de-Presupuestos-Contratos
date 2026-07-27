import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  markClassName?: string;
  showText?: boolean;
  /** Muestra los paths con clase para animar el trazo (preloader) */
  animatable?: boolean;
};

/**
 * Logotipo VISAX AI (monograma "V/K" + wordmark) reconstruido como SVG
 * para poder animar el trazo y mantener nitidez en cualquier tamaño.
 */
export function Logo({
  className,
  markClassName,
  showText = true,
  animatable = false,
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <svg
        viewBox="0 0 64 64"
        className={cn('h-9 w-9 shrink-0', markClassName)}
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoV" x1="14" y1="12" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#33C6F4" />
            <stop offset="0.5" stopColor="#3F7DFB" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <path
          d="M15 17 L32 51 L49 17"
          stroke="url(#logoV)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animatable ? 'logo-path' : undefined}
        />
        <path
          d="M39 27 L30 45 L40 55"
          stroke="#EAF0F8"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animatable ? 'logo-path' : undefined}
        />
      </svg>
      {showText && (
        <span className="font-display text-xl font-semibold tracking-wide">
          VISAX <span className="text-gradient">AI</span>
        </span>
      )}
    </span>
  );
}
