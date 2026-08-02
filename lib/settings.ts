import { prisma } from "@/lib/prisma";

// Siempre hay una única fila de configuración ("singleton"); si todavía no
// existe (primera vez que se usa), se crea sola con los valores por defecto.
// Se hace como "leer, y si no existe crear" (no upsert) para no reescribir
// la fila -y pisar `updatedAt`- cada vez que solo se está leyendo.
export async function getAppSettings() {
  const existing = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;

  try {
    return await prisma.appSettings.create({ data: { id: "singleton" } });
  } catch {
    // Carrera poco probable: otra petición la creó al mismo tiempo.
    const created = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    if (created) return created;
    throw new Error("No se pudo crear la configuración de la aplicación");
  }
}
