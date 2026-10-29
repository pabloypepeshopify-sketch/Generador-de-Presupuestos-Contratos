'use client';

import { useActionState } from 'react';
import { activarCuenta } from '@/acciones/auth';
import { BotonEnviar } from '@/components/cliente';
import { Campo } from '@/components/ui';

export function FormularioActivar() {
  const [estado, accion] = useActionState(activarCuenta, null);
  return (
    <form action={accion} className="flex flex-col gap-4">
      <Campo etiqueta="Usuario">
        <input className="input" name="usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="pablo o pepe" required />
      </Campo>
      <Campo etiqueta="Código de acceso" ayuda="Formato XXXX-XXXX-XXXX">
        <input className="input font-mono uppercase tracking-wider" name="codigo" autoComplete="one-time-code" placeholder="XXXX-XXXX-XXXX" required />
      </Campo>
      <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 10 caracteres">
        <input className="input" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Campo>
      <Campo etiqueta="Repite la contraseña">
        <input className="input" name="password2" type="password" autoComplete="new-password" minLength={10} required />
      </Campo>
      {estado && !estado.ok && (
        <p role="alert" className="rounded-lg border border-peligro/40 bg-peligro/10 px-3 py-2 text-[13px] text-[#ffb4b2]">
          {estado.error}
        </p>
      )}
      <BotonEnviar className="btn btn-primario btn-lg w-full" pendiente="Activando…">
        Guardar contraseña y entrar
      </BotonEnviar>
    </form>
  );
}
