import type { MetadataRoute } from 'next';
import { site } from '@/lib/site.config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#06060B',
    theme_color: '#06060B',
    icons: [
      { src: '/icon1.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
