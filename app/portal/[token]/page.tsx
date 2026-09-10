import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/clientPortal";
import { isFinalStatus } from "@/lib/taskDates";
import type { TaskStatus } from "@/lib/types";
import PortalView from "./PortalView";
import PinGate from "./PinGate";

// Página pública del portal del cliente. No pasa por el middleware de sesión
// del equipo (ver middleware.ts: /portal no está en el matcher), así que el
// cliente entra solo con su enlace, sin cuenta ni contraseña de la
// plataforma. La única llave es el token del enlace y, si se configuró, el
// PIN.
export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: { params: { token: string } }) {
  const access = await prisma.clientAccess.findUnique({
    where: { token: params.token },
    select: {
      id: true,
      name: true,
      active: true,
      pinHash: true,
      showBudget: true,
      showSchedule: true,
      projectId: true,
      project: { select: { id: true, name: true, description: true } }
    }
  });

  // Enlace inexistente y enlace desactivado se ven igual a propósito: no se
  // le confirma a nadie que el token "existía pero lo apagaron".
  if (!access || !access.active) notFound();

  if (access.pinHash) {
    const token = cookies().get(PORTAL_COOKIE)?.value;
    const session = token ? await verifyPortalSession(token) : null;
    if (!session || session.accessId !== access.id) {
      return <PinGate token={params.token} projectName={access.project.name} />;
    }
  }

  const [reports, budgetItems, scheduleTasks] = await Promise.all([
    prisma.progressReport.findMany({
      where: { projectId: access.projectId, status: "PUBLISHED" },
      include: { photos: { orderBy: { order: "asc" } } },
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }]
    }),
    access.showBudget
      ? prisma.clientBudgetItem.findMany({
          where: { projectId: access.projectId },
          orderBy: { order: "asc" }
        })
      : Promise.resolve([]),
    // El cronograma del cliente solo muestra nombre, fechas y % de avance —
    // nunca comentarios, adjuntos ni el presupuesto interno de la tarea.
    access.showSchedule
      ? prisma.task.findMany({
          where: { projectId: access.projectId, startDate: { not: null } },
          select: { id: true, title: true, status: true, startDate: true, dueDate: true },
          orderBy: { startDate: "asc" }
        })
      : Promise.resolve([])
  ]);

  // Se deja constancia de la última visita, para saber si el cliente ya vio
  // los avances. No se espera el resultado: no vale la pena demorar la página
  // por esto, y si falla no pasa nada.
  prisma.clientAccess
    .update({ where: { id: access.id }, data: { lastVisitAt: new Date() } })
    .catch(() => {});

  const serialized = reports.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    reportDate: r.reportDate.toISOString(),
    progress: r.progress,
    photos: r.photos.map((p) => ({
      id: p.id,
      url: p.url,
      filename: p.filename,
      caption: p.caption
    }))
  }));

  const serializedSchedule = scheduleTasks.map((t) => ({
    id: t.id,
    title: t.title,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    progress: isFinalStatus(t.status as TaskStatus) ? 100 : 0
  }));

  return (
    <PortalView
      clientName={access.name}
      projectName={access.project.name}
      projectDescription={access.project.description}
      reports={serialized}
      budgetItems={access.showBudget ? budgetItems : []}
      showBudget={access.showBudget && budgetItems.length > 0}
      scheduleTasks={serializedSchedule}
      showSchedule={access.showSchedule && serializedSchedule.length > 0}
    />
  );
}
