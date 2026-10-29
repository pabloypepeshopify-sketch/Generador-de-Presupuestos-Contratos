import Link from 'next/link';

export default function NoEncontrado() {
  return (
    <div className="mx-auto mt-24 flex max-w-md flex-col items-center gap-3 px-4 text-center">
      <h1 className="titulo text-[26px]">No existe</h1>
      <p className="text-suave">Esta página o este negocio no existe (puede que lo hayan eliminado).</p>
      <Link href="/negocios" className="btn btn-primario">
        Ver negocios
      </Link>
    </div>
  );
}
