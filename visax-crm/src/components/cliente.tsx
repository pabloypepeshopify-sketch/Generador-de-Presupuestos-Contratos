'use client';

import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { CircleCheck, Loader2, TriangleAlert, X } from 'lucide-react';
import type { ResultadoAccion } from '@/lib/tipos';

// ---------- Avisos (confirmaciones y errores) ----------
type Aviso = { id: number; texto: string; tipo: 'ok' | 'error' };
const ContextoAvisos = createContext<(texto: string, tipo?: 'ok' | 'error') => void>(() => {});
export const useAviso = () => useContext(ContextoAvisos);

export function Avisos({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const avisar = useCallback((texto: string, tipo: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), tipo === 'error' ? 6000 : 3500);
  }, []);
  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:bottom-5 md:right-5 md:items-end">
        {lista.map((a) => (
          <div
            key={a.id}
            role={a.tipo === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13.5px] shadow-2xl ${
              a.tipo === 'error' ? 'border-peligro/50 bg-[#2a1517] text-[#ffd5d4]' : 'border-ok/40 bg-[#122219] text-[#d1fadf]'
            }`}
          >
            {a.tipo === 'error' ? <TriangleAlert className="size-4 shrink-0" /> : <CircleCheck className="size-4 shrink-0" />}
            <span>{a.texto}</span>
            <button className="ml-1 opacity-60 hover:opacity-100" onClick={() => setLista((l) => l.filter((x) => x.id !== a.id))} aria-label="Cerrar aviso">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}

const MENSAJES: Record<string, string> = {
  creado: 'Negocio creado',
  contacto: 'Contacto registrado',
  borrado: 'Negocio eliminado',
  bienvenida: 'Cuenta activada. ¡Bienvenido al CRM!',
  activada: 'Cuenta activada. Entra con tu nueva contraseña.',
};

/** Muestra el aviso que deja el servidor tras una redirección (cookie de un solo uso) */
export function AvisoDeUrl() {
  const ruta = usePathname();
  const avisar = useAviso();
  useEffect(() => {
    const clave = document.cookie.match(/(?:^|; )crm_aviso=([^;]*)/)?.[1];
    if (!clave) return;
    document.cookie = 'crm_aviso=; Max-Age=0; path=/; SameSite=Lax';
    if (MENSAJES[clave]) avisar(MENSAJES[clave]);
  }, [ruta]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ---------- Botones ----------
export function BotonEnviar({ children, className = 'btn btn-primario', pendiente = 'Guardando…', ...resto }: { children: ReactNode; className?: string; pendiente?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || resto.disabled} {...resto}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> {pendiente}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Ejecuta una acción del servidor desde un botón, con confirmación opcional, aviso y refresco */
export function useAccion() {
  const avisar = useAviso();
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const ejecutar = (accion: () => Promise<ResultadoAccion | void>, opciones: { confirmar?: string; alTerminar?: () => void } = {}) => {
    if (opciones.confirmar && !window.confirm(opciones.confirmar)) return;
    iniciar(async () => {
      try {
        const r = await accion();
        if (r && !r.ok) avisar(r.error, 'error');
        else {
          if (r?.mensaje) avisar(r.mensaje);
          opciones.alTerminar?.();
          router.refresh();
        }
      } catch (e) {
        // Las redirecciones de Next.js también llegan como excepción: se dejan pasar
        if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw e;
        avisar('No se ha podido completar. Revisa la conexión.', 'error');
      }
    });
  };
  return { ejecutar, pendiente };
}

/** Muestra el resultado de un formulario con useActionState */
export function useAvisoDeResultado(resultado: ResultadoAccion<unknown> | null, alAcertar?: () => void) {
  const avisar = useAviso();
  const router = useRouter();
  useEffect(() => {
    if (!resultado) return;
    if (!resultado.ok) avisar(resultado.error, 'error');
    else {
      if (resultado.mensaje) avisar(resultado.mensaje);
      alAcertar?.();
      router.refresh();
    }
  }, [resultado]); // eslint-disable-line react-hooks/exhaustive-deps
}
