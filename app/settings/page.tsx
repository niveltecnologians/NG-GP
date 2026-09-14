import { requireUser } from "@/lib/session";
import AiConnectionForm from "./AiConnectionForm";
import SyncManager from "./SyncManager";

export default async function SettingsPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return (
      <div className="card p-10 text-center text-slate-500">
        Solo un administrador puede entrar a Configuración.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
      </div>

      <AiConnectionForm />

      <div>
        <h2 className="text-lg font-semibold">Sincronizar con ObraFlow</h2>
        <p className="mt-1 text-sm text-slate-500">
          ObraFlow y NG-GP no están conectados en vivo — cada uno descarga un archivo y lo sube en el otro
          cuando quieran ponerse al día. Repite este proceso cada vez que necesiten sincronizar los cambios.
        </p>
        <div className="mt-4">
          <SyncManager />
        </div>
      </div>
    </div>
  );
}
