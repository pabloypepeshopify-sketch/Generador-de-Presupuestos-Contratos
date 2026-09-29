'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Botón que copia un texto al portapapeles (contraseña del WiFi). */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Navegadores sin API de portapapeles: selección + copiar clásico.
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };
  return (
    <button
      onClick={copy}
      className={cn(
        'flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 font-semibold text-white shadow-glow transition hover:brightness-110',
        className,
      )}
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {done ? 'Contraseña copiada' : 'Copiar contraseña'}
    </button>
  );
}
