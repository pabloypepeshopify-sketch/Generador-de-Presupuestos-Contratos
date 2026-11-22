import type { MetadataRoute } from 'next';
import { site } from '@/lib/site.config';

export default function robots(): MetadataRoute.Robots {
  return {
    // /api: formularios · /portal y /admin: zonas privadas futuras
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/portal', '/admin'] },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
