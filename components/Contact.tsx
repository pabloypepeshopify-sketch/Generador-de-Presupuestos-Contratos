'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MessageCircle, ArrowRight, Loader2, Check } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/lib/site.config';

export function Contact() {
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !msg.trim()) return;
    setStatus('loading');
    try {
      if (site.makeWebhook) {
        await fetch(site.makeWebhook, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'contacto',
            email,
            mensaje: msg,
            origen: 'web-visax-ai',
            enviadoEn: new Date().toISOString(),
          }),
        });
      }
      setStatus('done');
      setMsg('');
      setEmail('');
    } catch {
      setStatus('done');
    }
  };

  return (
    <section id="contacto" className="section relative">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Contacto"
              title={
                <>
                  ¿Hablamos de tu <span className="text-gradient italic">automatización</span>?
                </>
              }
              intro="Llámanos y en 5 minutos sabrás qué se puede automatizar en tu negocio. También puedes escribirnos: te respondemos rápido."
            />

            {/* Teléfono destacado */}
            <motion.a
              href={`tel:${site.phoneRaw}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              data-cursor="Llamar"
              className="border-gradient group mt-10 flex items-center justify-between gap-4 rounded-[var(--radius)] bg-bg-soft/40 p-6 transition-colors hover:bg-bg-soft/70"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
                  <Phone className="h-6 w-6" />
                </span>
                <div>
                  <span className="text-xs uppercase tracking-widest text-ink-faint">
                    Llama ahora
                  </span>
                  <span className="block font-display text-2xl sm:text-3xl">{site.phone}</span>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-ink-faint transition-transform group-hover:translate-x-1 group-hover:text-white" />
            </motion.a>

            {/* Otros canales */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href={`mailto:${site.email}`}
                data-cursor="Email"
                className="flex items-center gap-3 rounded-2xl border border-ink-line bg-bg-soft/40 p-4 transition-colors hover:border-brand-blue/40"
              >
                <Mail className="h-5 w-5 text-brand-cyan" />
                <span className="truncate text-sm text-ink-soft">{site.email}</span>
              </a>
              {site.whatsapp && (
                <a
                  href={`https://wa.me/${site.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="WhatsApp"
                  className="flex items-center gap-3 rounded-2xl border border-ink-line bg-bg-soft/40 p-4 transition-colors hover:border-brand-blue/40"
                >
                  <MessageCircle className="h-5 w-5 text-[#25D366]" />
                  <span className="text-sm text-ink-soft">Escríbenos por WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          {/* Formulario corto */}
          <motion.form
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            onSubmit={onSubmit}
            className="glass flex flex-col gap-4 rounded-[var(--radius)] p-7 sm:p-9"
          >
            <h3 className="font-display text-2xl">Escríbenos rápido</h3>
            <input
              type="email"
              required
              placeholder="Tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink-line bg-bg-soft/60 px-4 py-3 text-sm outline-none transition focus:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue/20"
            />
            <textarea
              required
              rows={4}
              placeholder="¿Qué te gustaría automatizar?"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full rounded-xl border border-ink-line bg-bg-soft/60 px-4 py-3 text-sm outline-none transition focus:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue/20"
            />
            <button
              type="submit"
              disabled={status === 'loading' || status === 'done'}
              data-cursor="Enviar"
              className="flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : status === 'done' ? (
                <>
                  <Check className="h-4 w-4" /> ¡Recibido! Te contestamos pronto
                </>
              ) : (
                <>
                  Enviar mensaje <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
