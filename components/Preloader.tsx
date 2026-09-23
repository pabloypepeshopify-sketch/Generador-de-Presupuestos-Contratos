'use client';

import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { markIntroDone } from '@/lib/intro';
import { cn } from '@/lib/utils';

/**
 * Intro breve (≤ 1 s): el isotipo aparece con un fundido y el overlay se
 * retira. Al retirarse avisa al hero, cuyas partículas nacen desde el centro
 * y se abren alrededor del hueco que deja el logo.
 * Solo escritorio y primera visita de la sesión (ver `introScript`).
 */
export function Preloader() {
  const [phase, setPhase] = useState<'show' | 'hide' | 'gone'>('show');

  useEffect(() => {
    if (document.documentElement.getAttribute('data-intro') !== 'play') {
      setPhase('gone');
      markIntroDone();
      return;
    }
    try {
      sessionStorage.setItem('vx-intro', '1');
    } catch {
      /* modo privado: la intro se repetirá, sin más */
    }
    const hide = setTimeout(() => {
      setPhase('hide');
      markIntroDone();
    }, 650);
    const gone = setTimeout(() => setPhase('gone'), 1000);
    return () => {
      clearTimeout(hide);
      clearTimeout(gone);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        'preloader fixed inset-0 z-[10000] hidden items-center justify-center bg-bg transition-opacity duration-300 ease-out lg:flex',
        phase === 'hide' && 'pointer-events-none opacity-0',
      )}
    >
      <Logo variant="mark" className="preloader-logo h-20" />
    </div>
  );
}
