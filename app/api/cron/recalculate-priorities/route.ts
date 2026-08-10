import { NextRequest, NextResponse } from "next/server";
import { recalculateTaskPriorities } from "@/lib/autoPriority";

// Red de seguridad: recalcula la prioridad automática de todas las tareas
// una vez al día, aunque nadie entre a la app ese día (Vercel Cron llama
// esta ruta sola, ver vercel.json). Las páginas normales ya recalculan al
// vuelo cada vez que alguien las visita, así que este cron solo cubre el
// caso de que pase un día completo sin que nadie abra un proyecto.
export async function GET(req: NextRequest) {
  // Si se configura la variable de entorno CRON_SECRET en Vercel, esta ruta
  // solo acepta llamadas que traigan ese secreto (así lo hace Vercel Cron
  // automáticamente). Si no se configura, queda abierta: no es un problema
  // de seguridad grave porque esta ruta solo recalcula prioridades, no
  // borra ni expone datos.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  await recalculateTaskPriorities();
  return NextResponse.json({ ok: true });
}
