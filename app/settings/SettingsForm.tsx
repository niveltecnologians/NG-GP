"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsForm({
  initialAppName,
  initialHasLogo,
  initialHasBanner
}: {
  initialAppName: string;
  initialHasLogo: boolean;
  initialHasBanner: boolean;
}) {
  const router = useRouter();
  const [appName, setAppName] = useState(initialAppName);
  const [hasLogo, setHasLogo] = useState(initialHasLogo);
  const [hasBanner, setHasBanner] = useState(initialHasBanner);
  const [logoVersion, setLogoVersion] = useState(0);
  const [bannerVersion, setBannerVersion] = useState(0);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [loadingBanner, setLoadingBanner] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setError(null);
    setNameSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName })
    });
    setSavingName(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo guardar el nombre");
      return;
    }
    setNameSaved(true);
    router.refresh();
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoadingLogo(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: form });
    setLoadingLogo(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo subir el logo");
      return;
    }
    setHasLogo(true);
    setLogoVersion((v) => v + 1);
    router.refresh();
  }

  async function handleRemoveLogo() {
    setLoadingLogo(true);
    await fetch("/api/settings/logo", { method: "DELETE" });
    setLoadingLogo(false);
    setHasLogo(false);
    router.refresh();
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoadingBanner(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/settings/banner", { method: "POST", body: form });
    setLoadingBanner(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo subir la imagen");
      return;
    }
    setHasBanner(true);
    setBannerVersion((v) => v + 1);
    router.refresh();
  }

  async function handleRemoveBanner() {
    setLoadingBanner(true);
    await fetch("/api/settings/banner", { method: "DELETE" });
    setLoadingBanner(false);
    setHasBanner(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Nombre de la aplicación</h2>
        <form onSubmit={handleSaveName} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              className="input"
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                setNameSaved(false);
              }}
              maxLength={60}
              required
            />
          </div>
          <button type="submit" disabled={savingName} className="btn">
            {savingName ? "Guardando..." : "Guardar"}
          </button>
        </form>
        {nameSaved && <p className="mt-2 text-sm text-emerald-600">Guardado. Se verá en toda la aplicación.</p>}
      </div>

      <div className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Logo</h2>
        <p className="mb-4 text-sm text-slate-500">Reemplaza el ícono cuadrado que aparece junto al nombre en la barra superior.</p>
        <div className="flex items-center gap-4">
          {hasLogo ? (
            <img
              src={`/api/settings/logo-image?v=${logoVersion}`}
              alt="Logo"
              className="h-14 w-14 rounded-lg border border-slate-200 object-contain p-1"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              {appName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => logoInputRef.current?.click()} disabled={loadingLogo}>
              {hasLogo ? "Cambiar logo" : "Subir logo"}
            </button>
            {hasLogo && (
              <button type="button" className="btn-secondary" onClick={handleRemoveLogo} disabled={loadingLogo}>
                Quitar
              </button>
            )}
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
        </div>
        <p className="mt-2 text-xs text-slate-400">Imagen cuadrada recomendada. JPG o PNG, máximo 2MB.</p>
      </div>

      <div className="card p-6">
        <h2 className="mb-1 text-lg font-semibold">Imagen / portada</h2>
        <p className="mb-4 text-sm text-slate-500">Se muestra en las pantallas de inicio de sesión y registro.</p>
        {hasBanner && (
          <img
            src={`/api/settings/banner-image?v=${bannerVersion}`}
            alt="Portada"
            className="mb-3 h-32 w-full rounded-lg border border-slate-200 object-cover"
          />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => bannerInputRef.current?.click()} disabled={loadingBanner}>
            {hasBanner ? "Cambiar imagen" : "Subir imagen"}
          </button>
          {hasBanner && (
            <button type="button" className="btn-secondary" onClick={handleRemoveBanner} disabled={loadingBanner}>
              Quitar
            </button>
          )}
        </div>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        <p className="mt-2 text-xs text-slate-400">JPG o PNG, máximo 3MB.</p>
      </div>
    </div>
  );
}
