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

// Avisa por la bandeja de entrada cuando un administrador agenda una cita
// para otra persona (queda pendiente de aceptar en su calendario).
export async function notifyCalendarInvite({
  userId,
  actorId,
  actorName,
  eventTitle,
  startsAt
}: {
  userId: string;
  actorId: string;
  actorName: string;
  eventTitle: string;
  startsAt: Date;
}) {
  if (userId === actorId) return;

  const when = startsAt.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });
  await prisma.ticket.create({
    data: {
      subject: `Nueva cita por confirmar: ${eventTitle}`,
      body: `${actorName} te agendó "${eventTitle}" para el ${when}. Entra a tu Calendario para aceptarla o rechazarla.`,
      senderId: actorId,
      recipientId: userId,
      status: "OPEN"
    }
  });
}
