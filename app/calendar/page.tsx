import { requireUser } from "@/lib/session";
import CalendarView from "./CalendarView";

export default async function CalendarPage() {
  const user = await requireUser();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <p className="text-sm text-slate-500">
          {user.role === "ADMIN"
            ? "Tu agenda personal. Como administrador, también puedes ver la disponibilidad de cualquier persona y agendarle una cita."
            : "Tu agenda personal. Si un administrador te agenda algo, te va a pedir que la aceptes o la rechaces aquí."}
        </p>
      </div>
      <CalendarView currentUserId={user.userId} currentUserName={user.name} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
