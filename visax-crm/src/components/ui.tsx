import type { CSSProperties, ReactNode } from 'react';
import { DoorOpen, Mail, MessageCircle, Phone, Users, CircleDot } from 'lucide-react';
import type { Socio } from '@/lib/tipos';
import { SERVICIO_CORTO } from '@/lib/textos';

export const conColor = (color: string) => ({ '--c': color }) as CSSProperties;

export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/marca.svg" alt="" className="h-6 w-auto" />
      {!compacto && (
        <span className="flex items-baseline gap-1.5 text-[15px] font-semibold tracking-[0.22em]">
          VISAX
          <span className="bg-[linear-gradient(100deg,#33c6f4,#7c5cff)] bg-clip-text text-[11px] tracking-[0.12em] text-transparent">AI</span>
          <span className="ml-1 rounded border border-borde-2 px-1.5 py-px text-[10px] font-medium tracking-normal text-suave">CRM</span>
        </span>
      )}
    </span>
  );
}

export function EstadoBadge({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span className="etiqueta" style={conColor(color)}>
      <span className="size-1.5 rounded-full bg-[var(--c)]" />
      {nombre}
    </span>
  );
}

export function Avatar({ socio, tam = 24 }: { socio?: Pick<Socio, 'nombre' | 'color'> | null; tam?: number }) {
  const nombre = socio?.nombre ?? '?';
  const color = socio?.color ?? '#4b5066';
  return (
    <span
      title={nombre}
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.42), background: `color-mix(in srgb, ${color} 55%, #0f0f17)`, boxShadow: `inset 0 0 0 1.5px ${color}` }}
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}

export function SocioNombre({ socio }: { socio?: Socio | null }) {
  if (!socio) return <span className="text-tenue">Sin asignar</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar socio={socio} tam={20} />
      {socio.nombre}
    </span>
  );
}

export function ServiciosEtiquetas({ codigos, max = 3 }: { codigos: string[]; max?: number }) {
  if (!codigos.length) return <span className="text-tenue">—</span>;
  const visibles = codigos.slice(0, max);
  return (
    <span className="flex flex-wrap gap-1">
      {visibles.map((c) => (
        <span key={c} className="rounded-md bg-white/[0.06] px-1.5 py-px text-[12px] text-suave">
          {SERVICIO_CORTO[c] ?? c}
        </span>
      ))}
      {codigos.length > max && <span className="text-[12px] text-tenue">+{codigos.length - max}</span>}
    </span>
  );
}

export function IconoInteraccion({ tipo, className = 'size-4' }: { tipo: string; className?: string }) {
  const Icono = { visita: DoorOpen, llamada: Phone, whatsapp: MessageCircle, email: Mail, reunion: Users }[tipo] ?? CircleDot;
  return <Icono className={className} aria-hidden />;
}

export function Seccion({ titulo, accion, children, className = '' }: { titulo: ReactNode; accion?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`caja ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <h2 className="text-[13.5px] font-semibold">{titulo}</h2>
        {accion}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Vacio({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-borde-2 px-6 py-10 text-center">
      <p className="font-medium">{titulo}</p>
      {texto && <p className="max-w-md text-suave">{texto}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Campo({ etiqueta, error, ayuda, children, className = '' }: { etiqueta: ReactNode; error?: string; ayuda?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[12.5px] font-medium text-suave">{etiqueta}</span>
      {children}
      {error ? <span className="text-[12.5px] text-peligro">{error}</span> : ayuda ? <span className="text-[12px] text-tenue">{ayuda}</span> : null}
    </label>
  );
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-medium uppercase tracking-wide text-tenue">{etiqueta}</dt>
      <dd className="mt-0.5 break-words">{children || <span className="text-tenue">—</span>}</dd>
    </div>
  );
}

export function CabeceraPagina({ titulo, sub, children }: { titulo: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="titulo text-[26px] leading-tight md:text-[30px]">{titulo}</h1>
        {sub && <p className="mt-1 text-suave">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
