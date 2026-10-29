'use client';

import { useActionState, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { actualizarPerfil, cambiarContrasena, generarCodigoAcceso } from '@/acciones/auth';
import { BotonEnviar, useAviso, useAvisoDeResultado } from '@/components/cliente';
import { Campo } from '@/components/ui';
import type { Socio } from '@/lib/tipos';

const COLORES = ['#7C5CFF', '#33C6F4', '#3F7DFB', '#22C55E', '#F5A524', '#EC4899', '#F25F5C', '#14B8A6'];

export function FormPerfil({ socio }: { socio: Socio }) {
  const [resultado, accion] = useActionState(actualizarPerfil, null);
  const [color, setColor] = useState(socio.color.toUpperCase());
  useAvisoDeResultado(resultado);
  return (
    <form action={accion} className="flex flex-col gap-4">
      <Campo etiqueta="Nombre que ve el otro socio">
        <input className="input" name="nombre" defaultValue={socio.nombre} required maxLength={60} />
      </Campo>
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-medium text-suave">Color</legend>
        <div className="flex flex-wrap gap-2">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`size-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
      </fieldset>
      <BotonEnviar className="btn btn-primario self-start">Guardar perfil</BotonEnviar>
    </form>
  );
}

export function FormContrasena() {
  const [resultado, accion] = useActionState(cambiarContrasena, null);
  const form = useRef<HTMLFormElement>(null);
  useAvisoDeResultado(resultado, () => form.current?.reset());
  return (
    <form ref={form} action={accion} className="grid gap-3 sm:grid-cols-2">
      <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 10 caracteres">
        <input className="input" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Campo>
      <Campo etiqueta="Repite la contraseña">
        <input className="input" name="password2" type="password" autoComplete="new-password" minLength={10} required />
      </Campo>
      <BotonEnviar className="btn self-start">Cambiar contraseña</BotonEnviar>
    </form>
  );
}

export function FormCodigo({ socios }: { socios: Socio[] }) {
  const [resultado, accion] = useActionState(generarCodigoAcceso, null);
  const avisar = useAviso();
  return (
    <div className="flex flex-col gap-3">
      <form action={accion} className="flex flex-wrap items-end gap-2">
        <Campo etiqueta="Para">
          <select className="input w-auto min-w-[160px]" name="usuario">
            {socios.map((s) => (
              <option key={s.id} value={s.usuario}>
                {s.nombre} ({s.usuario})
              </option>
            ))}
          </select>
        </Campo>
        <BotonEnviar className="btn" pendiente="Generando…">
          Generar código
        </BotonEnviar>
      </form>
      {resultado && !resultado.ok && <p className="text-[13px] text-peligro">{resultado.error}</p>}
      {resultado?.ok && resultado.datos && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ok/40 bg-ok/[0.07] p-3">
          <code className="font-mono text-[18px] tracking-widest">{resultado.datos}</code>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => navigator.clipboard?.writeText(resultado.datos!).then(() => avisar('Código copiado'))}
          >
            <Copy className="size-3.5" /> Copiar
          </button>
          <p className="w-full text-[12.5px] text-suave">Solo se muestra ahora. Caduca en 48 horas y anula los códigos anteriores de esa persona.</p>
        </div>
      )}
    </div>
  );
}
