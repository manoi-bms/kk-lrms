import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'pg'],
};

export default nextConfig;
