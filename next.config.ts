import type { NextConfig } from 'next';
import packageJson from './package.json';

const nextConfig: NextConfig = {
  // Emits a fully static site to out/, served by nginx in docker/ui-server.
  // Platform URLs are read at runtime from server.json (see initConfig).
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@arcus/core'],
  env: {
    // The client version sent to the platform (X-Client-Version). docker/bin/build.sh
    // sets it to the image tag; otherwise it is the package.json version.
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version,
  },
};

export default nextConfig;
