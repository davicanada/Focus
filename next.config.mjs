/** @type {import('next').NextConfig} */
const nextConfig = {
  // Otimizacao de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  // Otimizacao de imports pesados
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },

  // Compressao
  compress: true,

  // Webpack: exclude pdfjs-dist worker from bundling (loaded from CDN)
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
