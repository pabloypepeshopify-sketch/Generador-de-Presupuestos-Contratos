import { exigirSocio, obtenerCatalogos } from '@/lib/sesion';
import { valoresUsados } from '@/lib/filtros';
import { CabeceraPagina } from '@/components/ui';
import { FormularioAlta } from './formulario';

export const metadata = { title: 'Nuevo negocio' };

export default async function NuevoNegocio() {
  const { supabase, socio } = await exigirSocio();
  const [cat, usados] = await Promise.all([obtenerCatalogos(), valoresUsados(supabase)]);
  return (
    <div className="mx-auto max-w-3xl">
      <CabeceraPagina
        titulo={
          <>
            Nuevo <span className="acento-texto">negocio</span>
          </>
        }
        sub="Solo el nombre es obligatorio. El resto se completa después desde la ficha."
      />
      <FormularioAlta yo={socio} socios={cat.socios} servicios={cat.servicios} tiposTarea={cat.tiposTarea} sectores={usados.sectores} localidades={usados.localidades} />
    </div>
  );
}
