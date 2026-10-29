'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CalendarCheck, Columns3, LayoutDashboard, LogOut, Plus, Search, Settings } from 'lucide-react';
import { cerrarSesion } from '@/acciones/auth';
import { Avatar, Logo } from '@/components/ui';
import type { Socio } from '@/lib/tipos';

const SECCIONES = [
  { href: '/', txt: 'Panel', Icono: LayoutDashboard },
  { href: '/negocios', txt: 'Negocios', Icono: Building2 },
  { href: '/kanban', txt: 'Kanban', Icono: Columns3 },
  { href: '/agenda', txt: 'Agenda', Icono: CalendarCheck },
];

const activa = (ruta: string, href: string) => (href === '/' ? ruta === '/' : ruta === href || ruta.startsWith(`${href}/`));

export function Navegacion({ socio }: { socio: Socio }) {
  const ruta = usePathname();
  return (
    <>
      {/* Escritorio: barra lateral */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[232px] flex-col border-r border-borde bg-[#0b0b12] md:flex">
        <div className="px-5 pt-5 pb-4">
          <Link href="/" aria-label="Panel">
            <Logo />
          </Link>
        </div>
        <form action="/negocios" className="relative mx-3 mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-tenue" />
          <input name="q" className="input pl-8" placeholder="Buscar negocio, contacto, teléfono" aria-label="Buscar" />
        </form>
        <Link href="/negocios/nuevo" className="btn btn-primario mx-3 mb-4">
          <Plus className="size-4" /> Nuevo negocio
        </Link>
        <nav className="flex flex-col gap-0.5 px-3" aria-label="Secciones">
          {SECCIONES.map(({ href, txt, Icono }) => (
            <Link
              key={href}
              href={href}
              aria-current={activa(ruta, href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
                activa(ruta, href) ? 'bg-white/[0.07] text-texto' : 'text-suave hover:bg-white/[0.04] hover:text-texto'
              }`}
            >
              <Icono className={`size-[18px] ${activa(ruta, href) ? 'text-cian' : ''}`} />
              {txt}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-borde p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar socio={socio} tam={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{socio.nombre}</p>
              <p className="text-[12px] text-tenue">Socio</p>
            </div>
            <Link href="/ajustes" className="btn btn-fantasma btn-sm px-2" aria-label="Ajustes" title="Ajustes">
              <Settings className="size-4" />
            </Link>
            <form action={cerrarSesion}>
              <button className="btn btn-fantasma btn-sm px-2" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Móvil: barra superior */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-borde bg-fondo/90 px-4 py-2.5 backdrop-blur md:hidden">
        <Link href="/" aria-label="Panel">
          <Logo />
        </Link>
        <form action="/negocios" className="relative ml-auto w-36">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-tenue" />
          <input name="q" className="input min-h-[34px] py-1 pl-7 text-[13px]" placeholder="Buscar" aria-label="Buscar negocio" />
        </form>
        <Link href="/ajustes" aria-label="Ajustes">
          <Avatar socio={socio} tam={30} />
        </Link>
      </header>

      {/* Móvil: navegación inferior */}
      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-borde bg-[#0b0b12]/95 px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        {SECCIONES.slice(0, 2).map(({ href, txt, Icono }) => (
          <Link key={href} href={href} aria-current={activa(ruta, href) ? 'page' : undefined} className={`flex w-16 flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${activa(ruta, href) ? 'text-texto' : 'text-tenue'}`}>
            <Icono className={`size-5 ${activa(ruta, href) ? 'text-cian' : ''}`} />
            {txt}
          </Link>
        ))}
        <Link href="/negocios/nuevo" aria-label="Nuevo negocio" className="grid size-12 -translate-y-2 place-items-center rounded-full bg-[linear-gradient(100deg,#33c6f4,#3f7dfb,#7c5cff)] text-white shadow-lg">
          <Plus className="size-6" />
        </Link>
        {SECCIONES.slice(2).map(({ href, txt, Icono }) => (
          <Link key={href} href={href} aria-current={activa(ruta, href) ? 'page' : undefined} className={`flex w-16 flex-col items-center gap-0.5 py-1 text-[11px] font-medium ${activa(ruta, href) ? 'text-texto' : 'text-tenue'}`}>
            <Icono className={`size-5 ${activa(ruta, href) ? 'text-cian' : ''}`} />
            {txt}
          </Link>
        ))}
      </nav>
    </>
  );
}
