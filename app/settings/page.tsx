import { requireUser } from "@/lib/session";
import { getAppSettings } from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return (
      <div className="card p-10 text-center text-slate-500">
        Solo un administrador puede cambiar la configuración de la aplicación.
      </div>
    );
  }

  const settings = await getAppSettings();

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-slate-500">Personaliza el nombre, el logo y la imagen de la aplicación para todo el equipo</p>
      </div>
      <SettingsForm initialAppName={settings.appName} initialHasLogo={settings.hasLogo} initialHasBanner={settings.hasBanner} />
    </div>
  );
}
