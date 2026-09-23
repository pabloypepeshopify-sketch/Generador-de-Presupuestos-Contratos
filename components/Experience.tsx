'use client';

import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { XP, XP_EVENTS, emit, hasHardwareWebGL, xpMode, type XpMode } from '@/lib/experience';

// Three.js + escena: solo se descarga si hay 3D (nunca con movimiento reducido).
const ExperienceCanvas = dynamic(() => import('@/components/three/Experience'), { ssr: false });

/** Si WebGL falla, la web vuelve a su versión HTML (rejilla de servicios, titular visible). */
function fallBackToHtml() {
  const d = document.documentElement;
  d.setAttribute('data-3d', 'off');
  d.setAttribute('data-hero', 'in');
  emit(XP_EVENTS.HERO_IN);
  emit(XP_EVENTS.READY);
}

class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    fallBackToHtml();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Experiencia 3D de fondo para el hero y los servicios (canvas fijo detrás
 * del contenido). El scroll mueve la cámara; al terminar los servicios el
 * canvas se desvanece y deja de renderizar.
 */
export function Experience() {
  const [mode, setMode] = useState<XpMode>('off');
  const [load, setLoad] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = xpMode();
    if (m === 'off') return;
    if (!hasHardwareWebGL()) {
      fallBackToHtml();
      return;
    }
    setMode(m);

    // Escritorio: carga ya, en paralelo al preloader. Móvil: en un momento ocioso.
    let idle = 0;
    if (m === 'full') setLoad(true);
    else {
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
      idle = ric(() => setLoad(true), { timeout: 1500 });
    }

    const hero = document.getElementById('inicio');
    const track = document.getElementById('servicios-track');
    if (!hero || !track) return;
    gsap.registerPlugin(ScrollTrigger);
    const setFade = (v: number) => {
      XP.fade = v;
      if (wrap.current) wrap.current.style.opacity = String(v);
    };
    const triggers = [
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        endTrigger: track,
        end: 'top top',
        onUpdate: (s) => (XP.hero = s.progress),
        onRefresh: (s) => (XP.hero = s.progress),
      }),
      ScrollTrigger.create({
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (s) => (XP.services = s.progress),
        onRefresh: (s) => (XP.services = s.progress),
      }),
      ScrollTrigger.create({
        trigger: track,
        start: 'bottom bottom',
        end: 'bottom 30%',
        onUpdate: (s) => setFade(1 - s.progress),
        onRefresh: (s) => setFade(1 - s.progress),
      }),
    ];
    return () => {
      triggers.forEach((t) => t.kill());
      if (idle) (window.cancelIdleCallback ?? window.clearTimeout)(idle);
    };
  }, []);

  if (mode === 'off') return null;

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[-1]"
      style={{ height: '100lvh' }}
    >
      {load && (
        <WebGLBoundary>
          <ExperienceCanvas quality={mode === 'full' ? 'full' : 'lite'} />
        </WebGLBoundary>
      )}
    </div>
  );
}
