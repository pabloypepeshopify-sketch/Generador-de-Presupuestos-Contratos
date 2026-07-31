'use client';

import { useRef, type ReactNode, type MouseEvent } from 'react';
import Link from 'next/link';
import { cn, prefersReducedMotion } from '@/lib/utils';

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  strength?: number;
  cursorLabel?: string;
  type?: 'button' | 'submit';
  ariaLabel?: string;
};

/**
 * Botón magnético: sigue sutilmente al cursor y vuelve a su sitio al salir.
 * Sirve como <Link>, ancla externa o <button>.
 */
export function MagneticButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className,
  strength = 0.35,
  cursorLabel,
  type = 'button',
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  const handleMove = (e: MouseEvent) => {
    if (prefersReducedMotion() || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    ref.current.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const handleLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate(0, 0)';
  };

  const styles = cn(
    'group relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-colors duration-300 will-change-transform',
    variant === 'primary' &&
      'text-white shadow-glow bg-brand [background-size:180%_180%] hover:[background-position:100%_50%]',
    variant === 'secondary' &&
      'border-gradient text-ink hover:text-white bg-white/[0.03] backdrop-blur',
    variant === 'ghost' && 'text-ink-soft hover:text-white',
    className,
  );

  const inner = (
    <span
      ref={ref}
      className="inline-flex items-center gap-2 transition-transform duration-300 ease-out"
    >
      {children}
    </span>
  );

  const shared = {
    className: styles,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    'data-cursor': cursorLabel,
    'aria-label': ariaLabel,
  } as const;

  if (href) {
    const external = href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:');
    if (external) {
      return (
        <a href={href} {...shared} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} {...shared}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} {...shared}>
      {inner}
    </button>
  );
}
