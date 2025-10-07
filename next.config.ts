import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Включаем standalone сборку для Docker
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
      resolveAlias: {
        // Исключаем проблемные модули из Turbopack
        'node-telegram-bot-api': 'empty',
      },
    },
  },
  // Отключаем Turbopack для серверных модулей с проблемными зависимостями
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('node-telegram-bot-api')
    }
    return config
  },
};

// Используем require для next-pwa чтобы избежать конфликтов типов
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);
