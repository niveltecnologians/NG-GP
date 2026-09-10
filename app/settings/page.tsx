import Link from "next/link";
import { requireUser } from "@/lib/session";
import SyncManager from "./SyncManager";

export default async function SyncPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return (
      <div className="card p-10 text-center text-slate-500">
        Solo un administrador puede sincronizar con ObraFlow.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-brand-600 hover:underline">
          ← Configuración
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Sincronizar con ObraFlow</h1>
        <p className="text-sm text-slate-500">
          ObraFlow y NG-GP no están conectados en vivo — cada uno descarga un archivo y lo sube en el otro cuando
          quieran ponerse al día. Repite este proceso cada vez que necesiten sincronizar los cambios.
        </p>
      </div>
      <SyncManager />
    </div>
  );
}
