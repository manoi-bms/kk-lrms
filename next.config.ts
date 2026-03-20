import type { NextConfig } from 'next';

const isDocker = process.env.DOCKER_BUILD === 'true';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // standalone output only for Docker builds; regular next start for bare server
  ...(isDocker && { output: 'standalone' as const }),
  serverExternalPackages: ['better-sqlite3', 'pg'],
  allowedDevOrigins: ['https://kk-lrms.bmscloud.in.th'],
  devIndicators: false,
};

export default nextConfig;
