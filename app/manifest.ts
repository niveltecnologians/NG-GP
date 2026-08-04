import type { MetadataRoute } from "next";
import { getAppSettings } from "@/lib/settings";

// Genera /manifest.webmanifest de forma dinámica: si el equipo personalizó
// el logo desde /settings, este manifest (y por lo tanto el ícono que se ve
// al "Agregar a inicio" en el celular) lo usa automáticamente; si no hay
// logo propio, cae en los íconos genéricos de public/icons.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getAppSettings();

  const icons = settings.hasLogo
    ? [
        { src: "/api/settings/logo-image", sizes: "192x192", type: settings.logoMimeType || "image/png" },
        { src: "/api/settings/logo-image", sizes: "512x512", type: settings.logoMimeType || "image/png" }
      ]
    : [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
      ];

  return {
    name: settings.appName,
    short_name: settings.appName.slice(0, 20),
    description: "Seguimiento de proyectos, tareas y requerimientos del equipo",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    icons
  };
}
