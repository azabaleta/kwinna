import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@kwinna/contracts"],
  images: {
    remotePatterns: [
      // Imágenes de desarrollo / mocks
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Imágenes de producción (uploads vía Cloudinary)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
