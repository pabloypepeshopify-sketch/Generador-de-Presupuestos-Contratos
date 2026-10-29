'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { cambiarEstado } from '@/acciones/negocios';
import { useAviso } from '@/components/cliente';
import { Avatar, IconoInteraccion, ServiciosEtiquetas } from '@/components/ui';
import { diaRelativo, haceTiempo, hora, vencimiento } from '@/lib/fechas';
import type { Estado, NegocioVista, Socio } from '@/lib/tipos';

const COLOR_VENCE = { atrasada: 'text-peligro', hoy: 'text-aviso', proxima: 'text-suave', sin_fecha: 'text-tenue' };

export function Tablero({ negocios, estados, todosEstados, socios }: { negocios: NegocioVista[]; estados: Estado[]; todosEstados: Estado[]; socios: Socio[] }) {
  const [lista, setLista] = useState(negocios);
  const [arrastrando, setArrastrando] = useState<NegocioVista | null>(null);
  const [, iniciar] = useTransition();
  const avisar = useAviso();
  const router = useRouter();
  useEffect(() => setLista(negocios), [negocios]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Cambio optimista: la tarjeta se mueve al momento y se deshace si la base de datos lo rechaza.
  // Cambiar de columna solo cambia el estado; el historial y las tareas del negocio no se tocan.
  const mover = (id: string, estado: string) => {
    const anterior = lista.find((n) => n.id === id);
    if (!anterior || anterior.estado === estado) return;
    const destino = todosEstados.find((e) => e.codigo === estado);
    setLista((l) => l.map((n) => (n.id === id ? { ...n, estado, estado_nombre: destino?.nombre ?? estado, estado_color: destino?.color ?? n.estado_color } : n)));
    iniciar(async () => {
      const r = await cambiarEstado(id, estado);
      if (!r.ok) {
        setLista((l) => l.map((n) => (n.id === id ? anterior : n)));
        avisar(r.error, 'error');
      } else {
        avisar(`«${anterior.nombre}» → ${destino?.nombre ?? estado}`);
        router.refresh();
      }
    });
  };

  const alSoltar = (e: DragEndEvent) => {
    setArrastrando(null);
    if (e.over) mover(String(e.active.id), String(e.over.id));
  };

  return (
    <DndContext
      sensors={sensores}
      onDragStart={(e) => setArrastrando(lista.find((n) => n.id === e.active.id) ?? null)}
      onDragEnd={alSoltar}
      onDragCancel={() => setArrastrando(null)}
      accessibility={{
        screenReaderInstructions: { draggable: 'Pulsa espacio para coger la tarjeta, usa las flechas para moverla y espacio para soltarla. También puedes usar el desplegable «Mover a».' },
      }}
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        <div className="flex min-h-[60vh] gap-3">
          {estados.map((e) => (
            <Columna key={e.codigo} estado={e} negocios={lista.filter((n) => n.estado === e.codigo)} socios={socios} todosEstados={todosEstados} mover={mover} />
          ))}
        </div>
      </div>
      <DragOverlay>{arrastrando && <Tarjeta n={arrastrando} socios={socios} todosEstados={todosEstados} mover={mover} flotando />}</DragOverlay>
    </DndContext>
  );
}

function Columna({ estado, negocios, socios, todosEstados, mover }: { estado: Estado; negocios: NegocioVista[]; socios: Socio[]; todosEstados: Estado[]; mover: (id: string, estado: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: estado.codigo });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${estado.nombre}: ${negocios.length}`}
      className={`flex w-[272px] shrink-0 flex-col rounded-xl border bg-panel/70 transition-colors ${isOver ? 'border-acento bg-acento/[0.06]' : 'border-borde'}`}
    >
      <header className="flex items-center gap-2 rounded-t-xl border-t-2 px-3 py-2.5" style={{ borderTopColor: estado.color }}>
        <span className="size-2 rounded-full" style={{ background: estado.color }} />
        <h2 className="flex-1 truncate text-[13px] font-semibold" title={estado.descripcion}>
          {estado.nombre}
        </h2>
        <span className="rounded-md bg-white/[0.06] px-1.5 text-[12px] text-suave tabular-nums">{negocios.length}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {negocios.map((n) => (
          <Arrastrable key={n.id} id={n.id}>
            <Tarjeta n={n} socios={socios} todosEstados={todosEstados} mover={mover} />
          </Arrastrable>
        ))}
        {negocios.length === 0 && <p className="px-2 py-6 text-center text-[12.5px] text-tenue">Suelta aquí</p>}
      </div>
    </section>
  );
}

function Arrastrable({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`touch-manipulation ${isDragging ? 'opacity-30' : ''}`}>
      {children}
    </div>
  );
}

function Tarjeta({ n, socios, todosEstados, mover, flotando = false }: { n: NegocioVista; socios: Socio[]; todosEstados: Estado[]; mover: (id: string, estado: string) => void; flotando?: boolean }) {
  const responsable = socios.find((s) => s.id === n.responsable_id);
  const v = vencimiento(n.proxima_fecha);
  return (
    <article className={`cursor-grab rounded-lg border border-borde bg-panel-2 p-3 text-[13px] active:cursor-grabbing ${flotando ? 'rotate-2 shadow-2xl ring-1 ring-acento' : 'hover:border-borde-2'}`}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/negocios/${n.id}`} className="font-semibold leading-snug hover:text-cian" onPointerDown={(e) => e.stopPropagation()}>
          {n.nombre}
        </Link>
        <Avatar socio={responsable} tam={22} />
      </div>
      {n.sector && <p className="mt-0.5 text-[12px] text-suave">{n.sector}</p>}
      {n.servicios_interes.length > 0 && (
        <div className="mt-2">
          <ServiciosEtiquetas codigos={n.servicios_interes} max={3} />
        </div>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-[12px] text-tenue">
        {n.ultima_tipo && <IconoInteraccion tipo={n.ultima_tipo} className="size-3" />}
        Último contacto: {haceTiempo(n.ultima_interaccion_en).toLowerCase()}
      </p>
      {n.proxima_accion && (
        <p className={`mt-1 text-[12px] font-medium ${COLOR_VENCE[v]}`}>
          {v === 'atrasada' ? 'Atrasada · ' : ''}
          {diaRelativo(n.proxima_fecha)}
          {n.proxima_hora ? ` ${hora(n.proxima_hora)}` : ''} · <span className="font-normal">{n.proxima_accion}</span>
        </p>
      )}
      {!flotando && (
        <select
          aria-label={`Mover ${n.nombre} a otro estado`}
          className="input mt-2 min-h-[28px] py-0.5 pl-2 text-[12px] text-suave"
          value=""
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => e.target.value && mover(n.id, e.target.value)}
        >
          <option value="">Mover a…</option>
          {todosEstados
            .filter((e) => e.codigo !== n.estado)
            .map((e) => (
              <option key={e.codigo} value={e.codigo}>
                {e.nombre}
              </option>
            ))}
        </select>
      )}
    </article>
  );
}
