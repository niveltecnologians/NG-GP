import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  encodeSyncMeta,
  isValidSyncPayload,
  taskPriorityFromObraFlow,
  taskStatusFromObraFlow,
  type SyncPayload
} from "@/lib/sync";

// Lee un archivo generado por ObraFlow ("Exportar JSON para NG-GP") y crea
// o actualiza proyectos y tareas. No hay conexión en vivo: esto se corre
// cada vez que alguien sube un archivo a mano desde Configuración.
//
// Las obras se emparejan por nombre exacto (sin mayúsculas/espacios de
// sobra) para no duplicar un proyecto que ya existe; las tareas se
// emparejan igual, por título, dentro del mismo proyecto. Si no hay
// coincidencia se crean nuevas.
//
// Los "asignados" de ObraFlow son solo nombres de persona (no tienen una
// cuenta de NG-GP con correo/contraseña necesariamente). Se intenta
// emparejar cada nombre con un usuario existente de NG-GP por nombre
// exacto; el que no tenga cuenta en NG-GP queda sin asignar en el tablero,
// pero su nombre no se pierde: se anota al principio de la descripción de
// la tarea para que quede visible.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede importar una sincronización" }, { status: 403 });
  }

  let data: SyncPayload;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "El archivo no es un JSON válido" }, { status: 400 });
  }
  if (!isValidSyncPayload(data)) {
    return NextResponse.json({ error: "Este archivo no tiene el formato de sincronización esperado (obraflow-nggp-v1)" }, { status: 400 });
  }

  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
  const userIdByName = new Map(allUsers.map((u) => [u.name.trim().toLowerCase(), u.id]));

  const allProjects = await prisma.project.findMany({ select: { id: true, name: true, description: true } });
  const projectIdByName = new Map(allProjects.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const externalToLocalProject = new Map<string, string>();

  let obrasCreadas = 0;
  let obrasActualizadas = 0;

  for (const o of data.obras) {
    const key = o.nombre.trim().toLowerCase();
    if (!key) continue;
    const meta = { cliente: o.cliente || "", direccion: o.direccion || "", fechaInicio: o.fechaInicio || "", fechaFin: o.fechaFin || "", estadoObra: o.estado || "planificada" };
    let localId = projectIdByName.get(key);
    if (localId) {
      const existing = allProjects.find((p) => p.id === localId);
      const description = encodeSyncMeta(meta, existing?.description || "");
      await prisma.project.update({ where: { id: localId }, data: { description } });
      obrasActualizadas++;
    } else {
      const description = encodeSyncMeta(meta, "");
      const created = await prisma.project.create({
        data: {
          name: o.nombre,
          description,
          boardMode: "TASKS",
          ownerId: user.userId,
          members: { create: [{ userId: user.userId }] }
        }
      });
      localId = created.id;
      projectIdByName.set(key, localId);
      obrasCreadas++;
    }
    if (o.externalId) externalToLocalProject.set(o.externalId, localId);
  }

  const sinCuentaNggp = new Set<string>();

  // Se asegura (si hace falta) que el usuario emparejado quede como
  // miembro del proyecto al que se le está asignando una tarea, para que
  // pueda verla en su tablero.
  const ensuredMembership = new Set<string>(); // `${projectId}|${userId}`
  async function ensureMember(projectId: string, userId: string) {
    const key = `${projectId}|${userId}`;
    if (ensuredMembership.has(key)) return;
    ensuredMembership.add(key);
    const exists = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } }).catch(() => null);
    if (!exists) {
      await prisma.projectMember.create({ data: { projectId, userId } }).catch(() => {});
    }
  }

  const existingTasksByProject = new Map<string, { id: string; title: string; description: string | null }[]>();

  let tareasCreadas = 0;
  let tareasActualizadas = 0;
  let tareasOmitidas = 0;

  for (const t of data.tareas) {
    const projectId = (t.obraExternalId && externalToLocalProject.get(t.obraExternalId)) || projectIdByName.get((t.obraNombre || "").trim().toLowerCase());
    if (!projectId) {
      tareasOmitidas++;
      continue;
    }

    const matchedUserIds: string[] = [];
    const unmatchedNames: string[] = [];
    for (const nombre of t.asignados || []) {
      const uid = userIdByName.get((nombre || "").trim().toLowerCase());
      if (uid) {
        matchedUserIds.push(uid);
        await ensureMember(projectId, uid);
      } else if (nombre) {
        unmatchedNames.push(nombre);
        sinCuentaNggp.add(nombre);
      }
    }

    const meta: Record<string, unknown> = { horaInicio: t.horaInicio || "", horaFin: t.horaFin || "", progreso: typeof t.progreso === "number" ? t.progreso : 0 };
    let baseDescripcion = t.descripcion || "";
    if (unmatchedNames.length) {
      baseDescripcion = `Asignado en ObraFlow (sin cuenta en NG-GP): ${unmatchedNames.join(", ")}\n${baseDescripcion}`;
    }
    const description = encodeSyncMeta(meta, baseDescripcion);
    const status = taskStatusFromObraFlow(t.estado);
    const priority = taskPriorityFromObraFlow(t.prioridad);
    const startDate = t.fechaInicio ? new Date(t.fechaInicio) : null;
    const dueDate = t.fechaFin ? new Date(t.fechaFin) : startDate;

    if (!existingTasksByProject.has(projectId)) {
      const tasks = await prisma.task.findMany({ where: { projectId }, select: { id: true, title: true, description: true } });
      existingTasksByProject.set(projectId, tasks);
    }
    const key = t.nombre.trim().toLowerCase();
    const existing = existingTasksByProject.get(projectId)!.find((x) => x.title.trim().toLowerCase() === key);

    if (existing) {
      await prisma.task.update({
        where: { id: existing.id },
        data: { title: t.nombre, description, status, priority, startDate, dueDate }
      });
      if (matchedUserIds.length) {
        await prisma.taskAssignee.deleteMany({ where: { taskId: existing.id } });
        await prisma.taskAssignee.createMany({
          data: matchedUserIds.map((userId) => ({ taskId: existing.id, userId })),
          skipDuplicates: true
        });
      }
      tareasActualizadas++;
    } else {
      const created = await prisma.task.create({
        data: {
          title: t.nombre,
          description,
          projectId,
          status,
          priority,
          startDate,
          dueDate,
          createdById: user.userId,
          assignees: { create: matchedUserIds.map((userId) => ({ userId })) }
        }
      });
      existingTasksByProject.get(projectId)!.push({ id: created.id, title: created.title, description: created.description });
      tareasCreadas++;
    }
  }

  return NextResponse.json({
    ok: true,
    obrasCreadas,
    obrasActualizadas,
    tareasCreadas,
    tareasActualizadas,
    tareasOmitidas,
    personasSinCuenta: Array.from(sinCuentaNggp)
  });
}
