'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Honeypot, PrivacyCheck, SelectField, TextArea, TextField } from '@/components/ui/Field';
import { SECTOR_OPTIONS, limpiarDiagnostico, validarDiagnostico, type Diagnostico, type Errors } from '@/lib/forms';
import { site } from '@/lib/site.config';

const VACIO: Diagnostico = { nombre: '', empresa: '', sector: '', email: '', telefono: '', mejorar: '', adicional: '', privacidad: false };

/** Formulario de diagnóstico inicial. Envía a /api/diagnostico (que lo pasa a n8n → Gmail). */
export function DiagnosticoForm() {
  const [d, setD] = useState<Diagnostico>(VACIO);
  const [errors, setErrors] = useState<Errors<Diagnostico>>({});
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'error'>('idle');
  const [trampa, setTrampa] = useState('');
  const pintado = useRef(0);
  const resultado = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pintado.current = Date.now();
  }, []);

  const set = <K extends keyof Diagnostico>(k: K, v: Diagnostico[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const limpio = limpiarDiagnostico(d);
    const errs = validarDiagnostico(limpio);
    setErrors(errs);
    const primero = Object.keys(errs)[0];
    if (primero) {
      document.getElementById(`f-${primero}`)?.focus();
      return;
    }
    setEstado('enviando');
    try {
      const res = await fetch('/api/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...limpio, web: trampa, t: Date.now() - pintado.current }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setEstado('ok');
        setD(VACIO);
      } else {
        if (body.errores) setErrors(body.errores);
        setEstado('error');
      }
    } catch {
      setEstado('error');
    }
    setTimeout(() => resultado.current?.focus(), 50);
  }

  if (estado === 'ok') {
    return (
      <div ref={resultado} tabIndex={-1} className="glass flex flex-col items-center gap-5 rounded-card-lg p-8 text-center outline-none sm:p-10" role="status">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-glow"
        >
          <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
        </motion.span>
        <h3 className="text-2xl tracking-tight">¡Solicitud recibida!</h3>
        <p className="max-w-sm text-ink-soft">
          Gracias. Te escribimos o te llamamos muy pronto para preparar tu diagnóstico inicial.
        </p>
        <button
          type="button"
          onClick={() => setEstado('idle')}
          className="rounded-full border border-ink-line px-5 py-2.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby="diagnostico-form-title" className="glass relative flex flex-col gap-4 rounded-card-lg p-6 sm:p-8">
      <h3 id="diagnostico-form-title" className="text-xl tracking-tight">
        Cuéntanos sobre tu empresa
      </h3>
      <Honeypot value={trampa} onChange={setTrampa} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nombre" name="nombre" autoComplete="name" value={d.nombre} onChange={(e) => set('nombre', e.target.value)} error={errors.nombre} />
        <TextField label="Empresa" name="empresa" autoComplete="organization" value={d.empresa} onChange={(e) => set('empresa', e.target.value)} error={errors.empresa} />
      </div>
      <SelectField label="Sector" name="sector" optional options={SECTOR_OPTIONS} value={d.sector} onChange={(e) => set('sector', e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" value={d.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
        <TextField label="Teléfono" name="telefono" type="tel" autoComplete="tel" inputMode="tel" optional value={d.telefono} onChange={(e) => set('telefono', e.target.value)} error={errors.telefono} />
      </div>
      <TextArea
        label="¿Qué te gustaría mejorar en tu empresa?"
        name="mejorar"
        placeholder="Por ejemplo: perdemos mucho tiempo pasando facturas a mano, no damos abasto con el teléfono…"
        value={d.mejorar}
        onChange={(e) => set('mejorar', e.target.value)}
        error={errors.mejorar}
      />
      <TextArea
        label="Información adicional"
        name="adicional"
        optional
        rows={3}
        placeholder="Cuántos sois, qué programas usáis, cuándo te viene bien que te llamemos…"
        value={d.adicional}
        onChange={(e) => set('adicional', e.target.value)}
      />
      <PrivacyCheck checked={d.privacidad} onChange={(v) => set('privacidad', v)} error={errors.privacidad} />

      <AnimatePresence>
        {estado === 'error' && (
          <motion.div
            ref={resultado}
            tabIndex={-1}
            role="alert"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm outline-none"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
            <span>
              No hemos podido enviar tu solicitud. Vuelve a intentarlo o llámanos al{' '}
              <a href={`tel:${site.phoneRaw}`} className="whitespace-nowrap font-semibold underline">
                {site.phone}
              </a>{' '}
              o al{' '}
              <a href={`tel:${site.callPhoneRaw}`} className="whitespace-nowrap font-semibold underline">
                {site.callPhone}
              </a>
              .
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#06060B] shadow-glow transition hover:bg-brand-silver disabled:opacity-70"
      >
        {estado === 'enviando' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Enviando…
          </>
        ) : (
          <>
            Solicitar diagnóstico <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
