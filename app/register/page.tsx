import RegisterForm from "./RegisterForm";
import { getAppSettings } from "@/lib/settings";

export default async function RegisterPage() {
  const settings = await getAppSettings();
  const initials = settings.appName.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto mt-12 max-w-sm sm:mt-20">
      {settings.hasBanner && (
        <img
          src="/api/settings/banner-image"
          alt={settings.appName}
          className="mb-6 h-32 w-full rounded-xl object-cover shadow-card"
        />
      )}
      <div className="mb-6 flex flex-col items-center">
        {settings.hasLogo ? (
          <img
            src="/api/settings/logo-image"
            alt={settings.appName}
            className="mb-3 h-11 w-11 rounded-xl object-contain shadow-card-hover"
          />
        ) : (
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-card-hover">
            {initials}
          </div>
        )}
        <h1 className="text-center text-2xl font-bold text-slate-900">Crear cuenta</h1>
        <p className="mt-1 text-center text-sm text-slate-500">El primer usuario registrado será administrador</p>
      </div>
      <div className="card p-6 sm:p-7">
        <RegisterForm />
      </div>
      <p className="mt-5 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <a href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Inicia sesión
        </a>
      </p>
    </div>
  );
}
