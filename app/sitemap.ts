import type { MetadataRoute } from 'next';
import { site } from '@/lib/site.config';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${site.url}/aviso-legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${site.url}/privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${site.url}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
