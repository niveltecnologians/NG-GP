import { prisma } from "@/lib/prisma";

// Crea un requerimiento automático en la bandeja de entrada de la persona
// asignada, para que se entere de inmediato de la nueva tarea.
export async function notifyTaskAssignment({
  assigneeId,
  actorId,
  actorName,
  taskTitle,
  projectName
}: {
  assigneeId: string;
  actorId: string;
  actorName: string;
  taskTitle: string;
  projectName: string;
}) {
  if (assigneeId === actorId) return; // no te notificas a ti mismo

  await prisma.ticket.create({
    data: {
      subject: `Se te asignó la tarea: ${taskTitle}`,
      body: `${actorName} te asignó la tarea "${taskTitle}" en el proyecto "${projectName}".`,
      senderId: actorId,
      recipientId: assigneeId,
      status: "OPEN"
    }
  });
}
