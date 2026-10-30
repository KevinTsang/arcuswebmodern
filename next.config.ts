import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emits a fully static site to out/, served by nginx in docker/ui-server.
  // Platform URLs are read at runtime from server.json (see initConfig).
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@arcus/core'],
};

export default nextConfig;
