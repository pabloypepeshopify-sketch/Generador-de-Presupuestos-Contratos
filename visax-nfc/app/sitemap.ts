import type { MetadataRoute } from 'next';
import { site } from '@/lib/site.config';
import { products } from '@/lib/products';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, priority: 1 },
    ...products.map((p) => ({ url: `${site.url}/productos/${p.slug}`, lastModified: now, priority: 0.9 })),
    ...['condiciones', 'aviso-legal', 'privacidad', 'cookies'].map((s) => ({
      url: `${site.url}/${s}`,
      lastModified: now,
      priority: 0.3,
    })),
  ];
}
