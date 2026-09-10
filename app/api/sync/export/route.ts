import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SYNC_FORMAT, decodeSyncMeta, taskPriorityToObraFlow, taskStatusToObraFlow, type SyncPayload } from "@/lib/sync";

// Genera el archivo que ObraFlow puede leer con "Importar JSON de NG-GP".
// Solo un administrador puede exportar: el archivo incluye todos los
// proyectos y tareas del sistema, no solo los del usuario que lo pide.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede exportar la sincronización" }, { status: 403 });
  }

  const [projects, users] = await Promise.all([
    prisma.project.findMany({
      include: {
        tasks: {
          include: {
            assignees: { include: { user: { select: { id: true, name: true } } } },
            assignee: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.user.findMany({ select: { id: true, name: true } })
  ]);

  const payload: SyncPayload = {
    syncFormat: SYNC_FORMAT,
    generatedAt: new Date().toISOString(),
    source: "nggp",
    obras: projects.map((p) => {
      const { meta } = decodeSyncMeta(p.description);
      return {
        externalId: p.id,
        nombre: p.name,
        cliente: typeof meta.cliente === "string" ? meta.cliente : "",
        direccion: typeof meta.direccion === "string" ? meta.direccion : "",
        fechaInicio: typeof meta.fechaInicio === "string" ? meta.fechaInicio : "",
        fechaFin: typeof meta.fechaFin === "string" ? meta.fechaFin : "",
        estado: typeof meta.estadoObra === "string" ? meta.estadoObra : "en_curso"
      };
    }),
    personas: users.map((u) => ({ externalId: u.id, nombre: u.name, rol: "" })),
    tareas: projects.flatMap((p) =>
      p.tasks.map((t) => {
        const { meta, rest } = decodeSyncMeta(t.description);
        const assigneeNames = t.assignees.length
          ? t.assignees.map((a) => a.user.name)
          : t.assignee
          ? [t.assignee.name]
          : [];
        const progreso = typeof meta.progreso === "number" ? meta.progreso : t.status === "DONE" ? 100 : 0;
        return {
          externalId: t.id,
          obraExternalId: p.id,
          obraNombre: p.name,
          nombre: t.title,
          descripcion: rest || "",
          fechaInicio: t.startDate ? t.startDate.toISOString().slice(0, 10) : "",
          fechaFin: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
          horaInicio: typeof meta.horaInicio === "string" ? meta.horaInicio : "",
          horaFin: typeof meta.horaFin === "string" ? meta.horaFin : "",
          estado: taskStatusToObraFlow(t.status),
          prioridad: taskPriorityToObraFlow(t.priority),
          progreso,
          asignados: assigneeNames
        };
      })
    )
  };

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="NGGP_sync_${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
}
