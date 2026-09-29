import { useId } from 'react';
import Image from 'next/image';
import { AtSign, BellRing, ChefHat, Nfc, Wifi } from 'lucide-react';
import type { Product, ProductIcon } from '@/lib/products';
import { cn } from '@/lib/utils';

const ICONS: Record<ProductIcon, typeof Wifi> = { order: ChefHat, social: AtSign, waiter: BellRing, wifi: Wifi };

/**
 * Imagen del producto: la foto real si la hay y, si no, una placa con el icono
 * del servicio (sin inventar un diseño de producto). Rellena su contenedor.
 */
export function ProductArt({
  product,
  sizes,
  priority,
  className,
}: {
  product: Product;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  if (product.image)
    return (
      <Image
        src={product.image}
        alt={product.name}
        fill
        sizes={sizes}
        priority={priority}
        className={cn('object-contain', className)}
      />
    );

  const Icon = ICONS[product.icon ?? 'order'];
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={product.name} className={cn('absolute inset-0 h-full w-full', className)}>
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#33C6F4" stopOpacity="0.2" />
          <stop offset="1" stopColor="#7C5CFF" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`${uid}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}s`} gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0" stopColor="#EAF0F8" />
          <stop offset="0.55" stopColor="#33C6F4" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="12" y="12" width="76" height="76" rx="18" fill="#0A0A12" fillOpacity="0.55" />
      <rect x="12" y="12" width="76" height="76" rx="18" fill={`url(#${uid}f)`} />
      <rect x="12" y="12" width="76" height="76" rx="18" fill={`url(#${uid}h)`} stroke="#fff" strokeOpacity="0.14" strokeWidth="0.6" />
      <Icon x={31} y={31} width={38} height={38} strokeWidth={1.25} color={`url(#${uid}s)`} />
      <Nfc x={70} y={18} width={12} height={12} strokeWidth={1.6} color="#33C6F4" opacity={0.85} />
    </svg>
  );
}
