import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Permite abrir la app en desarrollo desde el celular (red local).
  // Si cambia la IP, usa la que muestra "Network" en npm run dev.
  allowedDevOrigins: ["192.168.1.12"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
