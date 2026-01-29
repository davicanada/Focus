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
};

export default nextConfig;
