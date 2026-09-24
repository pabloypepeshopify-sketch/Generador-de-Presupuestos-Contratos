'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, MessageCircle, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useCart } from './CartProvider';
import { cartTotals, whatsappOrderUrl } from '@/lib/order';
import { TIERS, eur, unitPrice } from '@/lib/pricing';
import { site } from '@/lib/site.config';

type Status = 'idle' | 'loading' | 'whatsapp' | 'error';

/** Siguiente tramo de descuento alcanzable para una línea. */
function nextTier(qty: number) {
  return [...TIERS].reverse().find((t) => qty < t.min);
}

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();
  const [status, setStatus] = useState<Status>('idle');
  const { lines, subtotal, shipping, total } = cartTotals(items);
  const toFree = site.shipping.freeFrom - subtotal;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const lenis = (window as unknown as { lenis?: { stop: () => void; start: () => void } }).lenis;
    lenis?.stop();
    return () => {
      window.removeEventListener('keydown', onKey);
      lenis?.start();
    };
  }, [open, setOpen]);

  useEffect(() => {
    if (status === 'whatsapp' || status === 'error') setStatus('idle');
    // al cambiar el carrito se vuelve a intentar el pago normal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const checkout = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.status === 503) return setStatus('whatsapp');
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error('checkout');
      window.location.href = data.url;
    } catch {
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9995] flex justify-end bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Carrito"
        >
          <motion.aside
            data-lenis-prevent
            className="flex h-full w-full max-w-md flex-col border-l border-ink-line bg-bg-soft shadow-card"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-ink-line px-6 py-5">
              <h2 className="flex items-center gap-2 font-display text-2xl">
                <ShoppingBag className="h-5 w-5 text-brand-cyan" /> Tu pedido
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-line text-ink-soft transition hover:text-white"
                aria-label="Cerrar carrito"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <ShoppingBag className="h-10 w-10 text-ink-faint" />
                <p className="text-ink-soft">Tu carrito está vacío.</p>
                <a
                  href="/#productos"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-brand-violet/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-brand-violet"
                >
                  Ver productos
                </a>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  {lines.map((l) => {
                    const next = nextTier(l.qty);
                    return (
                      <li key={l.product.slug} className="rounded-2xl border border-ink-line bg-bg/60 p-4">
                        <div className="flex gap-4">
                          <div className="relative h-20 w-16 shrink-0">
                            <Image src={l.product.image} alt="" fill sizes="64px" className="object-contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug">{l.product.name}</p>
                            <p className="mt-1 text-sm text-ink-soft">
                              {eur(l.unit)}/ud
                              {l.off > 0 && (
                                <span className="ml-2 rounded-full bg-brand-violet/20 px-2 py-0.5 text-xs font-semibold text-white">
                                  −{Math.round(l.off * 100)} %
                                </span>
                              )}
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center rounded-full border border-ink-line">
                                <button
                                  onClick={() => setQty(l.product.slug, l.qty - 1)}
                                  disabled={l.qty <= 1}
                                  className="flex h-9 w-9 items-center justify-center text-ink-soft transition hover:text-white disabled:opacity-30"
                                  aria-label={`Quitar una unidad de ${l.product.shortName}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                                  {l.qty}
                                </span>
                                <button
                                  onClick={() => setQty(l.product.slug, l.qty + 1)}
                                  className="flex h-9 w-9 items-center justify-center text-ink-soft transition hover:text-white"
                                  aria-label={`Añadir una unidad de ${l.product.shortName}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              <span className="font-semibold tabular-nums">{eur(l.total)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => remove(l.product.slug)}
                            className="self-start text-ink-faint transition hover:text-white"
                            aria-label={`Eliminar ${l.product.shortName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {next && (
                          <p className="mt-3 text-xs text-brand-cyan">
                            Añade {next.min - l.qty} más y pagas {eur(unitPrice(l.product.price, next.min))}/ud (−
                            {Math.round(next.off * 100)} %)
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <footer className="space-y-3 border-t border-ink-line px-6 py-5">
                  <p className="flex items-center gap-2 text-xs text-ink-soft">
                    <Truck className="h-4 w-4 text-brand-cyan" />
                    {toFree > 0
                      ? `Te faltan ${eur(toFree)} para el envío gratis`
                      : '¡Tienes el envío gratis!'}
                  </p>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between text-ink-soft">
                      <dt>Subtotal</dt>
                      <dd className="tabular-nums">{eur(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between text-ink-soft">
                      <dt>Envío ({site.shipping.zone})</dt>
                      <dd className="tabular-nums">{shipping ? eur(shipping) : 'Gratis'}</dd>
                    </div>
                    <div className="flex justify-between pt-1 text-lg font-semibold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">{eur(total)}</dd>
                    </div>
                    <p className="text-xs text-ink-faint">IVA incluido</p>
                  </dl>

                  {status === 'whatsapp' ? (
                    <div className="space-y-3 rounded-2xl border border-[#25D366]/40 bg-[#25D366]/10 p-4">
                      <p className="text-sm">
                        El pago con tarjeta se activa en breve. Mientras tanto, envíanos el pedido por WhatsApp y te
                        confirmamos el pago y el envío.
                      </p>
                      <a
                        href={whatsappOrderUrl(items)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 font-semibold text-[#06060B]"
                      >
                        <MessageCircle className="h-5 w-5" /> Enviar pedido por WhatsApp
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={checkout}
                      disabled={status === 'loading'}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 font-semibold text-white shadow-glow transition disabled:opacity-60"
                    >
                      <Lock className="h-4 w-4" />
                      {status === 'loading' ? 'Abriendo pago seguro…' : `Pagar ${eur(total)}`}
                    </button>
                  )}
                  {status === 'error' && (
                    <p className="text-sm text-ink-soft" role="alert">
                      No se pudo abrir el pago. Inténtalo de nuevo o{' '}
                      <a className="text-white underline" href={whatsappOrderUrl(items)} target="_blank" rel="noopener noreferrer">
                        pídelo por WhatsApp
                      </a>
                      .
                    </p>
                  )}
                  <p className="text-center text-xs text-ink-faint">
                    En el pago te pedimos el nombre de tu negocio y el enlace que grabamos en tu NFC.
                  </p>
                </footer>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
