import Link from 'next/link';
import { Logo } from '@/components/ui';
import { FormularioActivar } from './formulario';

export const metadata = { title: 'Activar cuenta' };

export default function PaginaActivar() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(60%_50%_at_50%_0%,rgba(51,198,244,0.12),transparent_70%)] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="caja p-6">
          <h1 className="titulo text-[24px] leading-tight">
            Elige tu <span className="acento-texto">contraseña</span>
          </h1>
          <p className="mt-1 mb-5 text-suave">
            Introduce el código de un solo uso que te han dado. Sirve para el primer acceso y para recuperar la cuenta. Caduca a las 48 horas.
          </p>
          <FormularioActivar />
        </div>
        <p className="mt-5 text-center text-[13px] text-suave">
          ¿Ya tienes contraseña?{' '}
          <Link href="/login" className="text-cian hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
