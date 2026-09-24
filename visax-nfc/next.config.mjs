/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // three.js / R3F transpile safety
  transpilePackages: ['three'],
};

export default nextConfig;
