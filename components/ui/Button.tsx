'use client';

import { useRef, type ReactNode, type MouseEvent } from 'react';
import Link from 'next/link';
import { cn, prefersReducedMotion } from '@/lib/utils';

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  className?: string;
  strength?: number;
  type?: 'button' | 'submit';
  ariaLabel?: string;
};

/**
 * Botón de la marca. El contenido sigue sutilmente al cursor (solo con ratón y
 * sin movimiento reducido). Sirve como <Link>, ancla externa o <button>.
 *  - primary: píldora blanca con texto oscuro (contraste 19:1) y halo de marca
 *  - secondary: píldora con borde degradado
 */
export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  className,
  strength = 0.25,
  size = 'md',
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
    'group relative inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-300 will-change-transform',
    size === 'md' ? 'px-7 py-3.5 text-sm' : 'px-5 py-2.5 text-sm',
    variant === 'primary' &&
      'bg-white text-[#06060B] shadow-glow hover:bg-brand-silver',
    variant === 'secondary' && 'border-gradient bg-bg-raise text-ink hover:bg-bg-soft',
    variant === 'ghost' && 'text-ink-soft hover:text-ink',
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
    onClick,
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
    <button type={type} {...shared}>
      {inner}
    </button>
  );
}
