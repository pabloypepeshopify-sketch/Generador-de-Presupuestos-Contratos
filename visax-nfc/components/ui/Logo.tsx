import { useId } from 'react';
import { cn } from '@/lib/utils';
import { logoSvg, type LogoVariant } from '@/lib/brand';

type LogoProps = {
  /** ALTURA del logo (p. ej. "h-20"); el ancho sale de la proporción. Por defecto, tamaño de header. */
  className?: string;
  variant?: LogoVariant;
};

/** Logotipo VISAX NFC: SVG en línea desde lib/brand.ts, nítido a cualquier tamaño. */
export function Logo({ className, variant = 'lockup' }: LogoProps) {
  const id = `vx${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <span
      role="img"
      aria-label="VISAX NFC"
      className={cn(
        variant === 'word'
          ? 'block [&>svg]:block [&>svg]:h-auto [&>svg]:w-full'
          : 'inline-block shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-auto',
        className ?? 'h-6 md:h-[30px]',
      )}
      dangerouslySetInnerHTML={{ __html: logoSvg(variant, id, 'aria-hidden="true" focusable="false"') }}
    />
  );
}
