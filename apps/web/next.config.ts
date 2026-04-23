import type { NextConfig } from "next";

const securityHeaders = [
  // Impide que la app sea embebida en un <iframe> de otro origen — previene clickjacking.
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  // Bloquea MIME-type sniffing — el browser respeta el Content-Type declarado.
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Envía solo el origen en el Referer (sin path ni query) a sitios externos.
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Fuerza HTTPS durante 1 año e incluye subdominios.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Permisos de APIs del browser: desactiva lo que la tienda no usa.
  {
    key:   "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
];

const nextConfig: NextConfig = {
  // standalone empaqueta solo lo necesario para correr — ideal para Docker / Railway.
  output: "standalone",

  // contracts ahora se compila a dist/index.js via tsup — transpilePackages ya no es necesario.
  // transpilePackages: ["@kwinna/contracts"],

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

  async headers() {
    return [
      {
        // Aplica los headers de seguridad a todas las rutas.
        source:  "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
