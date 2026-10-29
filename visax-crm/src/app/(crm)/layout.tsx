import { exigirSocio } from '@/lib/sesion';
import { Navegacion } from './navegacion';

// Todo lo que cuelga de aquí es privado: sin sesión de socio, al login.
export default async function LayoutCRM({ children }: { children: React.ReactNode }) {
  const { socio } = await exigirSocio();
  return (
    <div className="min-h-dvh">
      <Navegacion socio={socio} />
      <main className="px-4 pt-4 pb-28 md:ml-[232px] md:px-8 md:pt-7 md:pb-12">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
