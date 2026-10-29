import Link from 'next/link';
import { Logo } from '@/components/ui';
import { FormularioLogin } from './formulario';

export const metadata = { title: 'Entrar' };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,92,255,0.16),transparent_70%)] px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="caja p-6">
          <h1 className="titulo text-[26px] leading-tight">
            Entra en el <span className="acento-texto">CRM</span>
          </h1>
          <p className="mt-1 mb-5 text-suave">Acceso solo para los socios de VISAX AI.</p>
          <FormularioLogin volver={volver} />
        </div>
        <p className="mt-5 text-center text-[13px] text-suave">
          ¿Primera vez o has olvidado la contraseña?{' '}
          <Link href="/activar" className="text-cian hover:underline">
            Usa tu código de acceso
          </Link>
        </p>
      </div>
    </main>
  );
}
