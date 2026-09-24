'use client';

import { useEffect } from 'react';
import { CART_KEY, useCart } from './CartProvider';

/** Vacía el carrito al volver de un pago completado. */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => {
    // Este efecto corre antes que la carga del proveedor: se borra también lo guardado.
    try {
      localStorage.removeItem(CART_KEY);
    } catch {
      /* ignorar */
    }
    clear();
  }, [clear]);
  return null;
}
