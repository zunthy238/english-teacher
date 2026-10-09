// app/manifest.ts
// Manifiesto PWA: nombre, colores e íconos para instalar la app.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Professor Mike — English A1 → C1",
    short_name: "Professor Mike",
    description: "Tu profesor de inglés con IA: lecciones diarias, ejercicios y progreso.",
    start_url: "/today",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#2563eb",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
