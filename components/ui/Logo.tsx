import { useId } from 'react';
import { cn } from '@/lib/utils';
import { logoSvg, type LogoVariant } from '@/lib/brand';

type LogoProps = {
  /** ALTURA del logo (p. ej. "h-20"); el ancho sale de la proporción. Por defecto, tamaño de header. */
  className?: string;
  variant?: LogoVariant;
};

/**
 * Logotipo VISAX AI. SVG en línea generado desde lib/brand.ts,
 * nítido a cualquier tamaño y sin deformar (alto fijo, ancho automático).
 */
export function Logo({ className, variant = 'lockup' }: LogoProps) {
  const id = `vx${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <span
      role="img"
      aria-label="VISAX AI"
      className={cn(
        'inline-block shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-auto',
        className ?? 'h-6 md:h-[30px]',
      )}
      dangerouslySetInnerHTML={{ __html: logoSvg(variant, id, 'aria-hidden="true" focusable="false"') }}
    />
  );
}
