'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MAX_QTY } from '@/lib/pricing';
import { productBySlug } from '@/lib/products';
import type { CartItem } from '@/lib/order';

type Cart = {
  items: CartItem[];
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<Cart | null>(null);
export const CART_KEY = 'visax-nfc-cart';
const KEY = CART_KEY;

const clampQty = (q: number) => Math.max(1, Math.min(MAX_QTY, Math.round(q) || 1));

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Recupera el carrito guardado (si el navegador lo permite)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        setItems(parsed.filter((i) => productBySlug(i.slug)).map((i) => ({ ...i, qty: clampQty(i.qty) })));
      }
    } catch {
      /* sin almacenamiento: carrito solo en memoria */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignorar */
    }
  }, [items, loaded]);

  const add = useCallback((slug: string, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.slug === slug);
      if (found) return prev.map((i) => (i.slug === slug ? { ...i, qty: clampQty(i.qty + qty) } : i));
      return [...prev, { slug, qty: clampQty(qty) }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback(
    (slug: string, qty: number) => setItems((prev) => prev.map((i) => (i.slug === slug ? { ...i, qty: clampQty(qty) } : i))),
    [],
  );
  const remove = useCallback((slug: string) => setItems((prev) => prev.filter((i) => i.slug !== slug)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.reduce((s, i) => s + i.qty, 0), open, setOpen, add, setQty, remove, clear }),
    [items, open, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart fuera de <CartProvider>');
  return ctx;
}
