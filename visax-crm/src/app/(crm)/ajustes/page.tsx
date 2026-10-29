import { exigirSocio, obtenerCatalogos } from '@/lib/sesion';
import { cerrarSesion } from '@/acciones/auth';
import { CabeceraPagina, Seccion } from '@/components/ui';
import { FormCodigo, FormContrasena, FormPerfil } from './formularios';

export const metadata = { title: 'Ajustes' };

export default async function Ajustes() {
  const { socio } = await exigirSocio();
  const cat = await obtenerCatalogos();
  return (
    <div className="mx-auto max-w-2xl">
      <CabeceraPagina titulo="Ajustes" sub={`Has entrado como «${socio.usuario}»`} />
      <div className="flex flex-col gap-5">
        <Seccion titulo="Mi perfil">
          <FormPerfil socio={socio} />
        </Seccion>
        <Seccion titulo="Cambiar mi contraseña">
          <FormContrasena />
        </Seccion>
        <Seccion titulo="Recuperar el acceso de un socio">
          <p className="mb-3 text-suave">
            Las cuentas no usan correo. Si alguien olvida su contraseña, genera aquí un código de un solo uso (caduca a las 48 horas) y pásaselo. Con él entra en «Usa tu código de acceso» y elige una contraseña nueva. Tú no llegas a ver su contraseña.
          </p>
          <FormCodigo socios={cat.socios} />
        </Seccion>
        <form action={cerrarSesion}>
          <button className="btn btn-peligro">Cerrar sesión</button>
        </form>
      </div>
    </div>
  );
}
