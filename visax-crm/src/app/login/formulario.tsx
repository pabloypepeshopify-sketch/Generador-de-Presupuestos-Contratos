'use client';

import { useActionState } from 'react';
import { iniciarSesion } from '@/acciones/auth';
import { BotonEnviar } from '@/components/cliente';
import { Campo } from '@/components/ui';

export function FormularioLogin({ volver }: { volver?: string }) {
  const [estado, accion] = useActionState(iniciarSesion, null);
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="volver" value={volver ?? '/'} />
      <Campo etiqueta="Usuario">
        <input className="input" name="usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="pablo o pepe" required autoFocus />
      </Campo>
      <Campo etiqueta="Contraseña">
        <input className="input" name="password" type="password" autoComplete="current-password" required />
      </Campo>
      {estado && !estado.ok && (
        <p role="alert" className="rounded-lg border border-peligro/40 bg-peligro/10 px-3 py-2 text-[13px] text-[#ffb4b2]">
          {estado.error}
        </p>
      )}
      <BotonEnviar className="btn btn-primario btn-lg w-full" pendiente="Entrando…">
        Entrar
      </BotonEnviar>
    </form>
  );
}
