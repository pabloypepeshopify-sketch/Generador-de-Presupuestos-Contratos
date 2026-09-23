'use client';

import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { markIntroDone } from '@/lib/intro';
import { XP_EVENTS } from '@/lib/experience';
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
    // Sin 3D: overlay ≈ 1 s contado desde la navegación. Con 3D: espera a que la
    // escena pinte (tope 2,4 s) y le pasa el testigo: el logo 3D aparece en el
    // mismo sitio y arranca la intro (remolino → explosión).
    let gone = 0;
    let hide = 0;
    const retire = () => {
      if (hide) return;
      hide = 1;
      setPhase('hide');
      markIntroDone();
      gone = window.setTimeout(() => setPhase('gone'), 300);
    };
    const with3d = document.documentElement.getAttribute('data-3d') === 'full';
    const deadline = window.setTimeout(retire, Math.max(0, (with3d ? 2400 : 650) - performance.now()));
    const onReady = () => window.setTimeout(retire, 120);
    if (with3d) window.addEventListener(XP_EVENTS.READY, onReady, { once: true });
    return () => {
      clearTimeout(deadline);
      clearTimeout(gone);
      window.removeEventListener(XP_EVENTS.READY, onReady);
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
