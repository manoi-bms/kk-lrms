import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      'node_modules/',
      '.next/',
      'dist/',
      'build/',
      'coverage/',
      '*.min.js',
    ],
  },
];

export default eslintConfig;
