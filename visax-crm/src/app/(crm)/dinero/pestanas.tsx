'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PESTANAS = [
  { href: '/dinero', txt: 'Resumen' },
  { href: '/dinero/cobros', txt: 'Cobros' },
  { href: '/dinero/gastos', txt: 'Gastos' },
  { href: '/dinero/facturas', txt: 'Facturas' },
];

export function PestanasDinero() {
  const ruta = usePathname();
  return (
    <nav aria-label="Apartados de dinero" className="mb-5 flex gap-1 overflow-x-auto border-b border-borde">
      {PESTANAS.map((p) => {
        const activa = p.href === '/dinero' ? ruta === '/dinero' : ruta.startsWith(p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activa ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3.5 py-2 text-[14px] font-medium whitespace-nowrap ${activa ? 'border-cian text-texto' : 'border-transparent text-suave hover:text-texto'}`}
          >
            {p.txt}
          </Link>
        );
      })}
    </nav>
  );
}
