import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'pg'],
  allowedDevOrigins: ['https://kk-lrms.bmscloud.in.th'],
};

export default nextConfig;
