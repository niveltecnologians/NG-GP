import { requireUser } from "@/lib/session";
import CalendarView from "./CalendarView";

export default async function CalendarPage() {
  const user = await requireUser();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <p className="text-sm text-slate-500">
          Tu agenda personal. También puedes ver la disponibilidad de cualquier persona del equipo y agendarle una
          cita; le queda pendiente de aceptar en su bandeja de entrada y en su propio calendario.
        </p>
      </div>
      <CalendarView currentUserId={user.userId} currentUserName={user.name} />
    </div>
  );
}
