/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Páginas del modelo anterior: se redirigen (301) para no perder enlaces ni posicionamiento.
  async redirects() {
    return [
      { source: '/servicios', destination: '/#que-hacemos', permanent: true },
      { source: '/servicios/:path*', destination: '/#que-hacemos', permanent: true },
      { source: '/reservar', destination: '/#visita', permanent: true },
    ];
  },
};

export default nextConfig;
