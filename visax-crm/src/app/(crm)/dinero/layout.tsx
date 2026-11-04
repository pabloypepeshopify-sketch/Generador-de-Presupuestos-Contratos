import { PestanasDinero } from './pestanas';

export const metadata = { title: 'Dinero' };

export default function LayoutDinero({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mb-4">
        <h1 className="titulo text-[26px] leading-tight md:text-[30px]">Dinero</h1>
        <p className="mt-1 text-suave">Lo que cobráis, lo que gastáis y lo que os queda. Importes sin IVA salvo que se indique.</p>
      </div>
      <PestanasDinero />
      {children}
    </>
  );
}
