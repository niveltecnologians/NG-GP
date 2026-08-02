"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PRESET_COLORS = ["#eef2ff", "#fef3c7", "#dcfce7", "#fee2e2", "#e0f2fe", "#f3e8ff", "#f8fafc"];

export default function EnvironmentForm({
  initialColor,
  initialHasImage
}: {
  initialColor: string | null;
  initialHasImage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [color, setColor] = useState(initialColor || "#eef2ff");
  const [hasImage, setHasImage] = useState(initialHasImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyColor(newColor: string) {
    setColor(newColor);
    setLoading(true);
    setError(null);
    const res = await fetch("/api/profile/background", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: newColor })
    });
    setLoading(false);
    if (res.ok) {
      setHasImage(false);
      router.refresh();
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/profile/background", { method: "POST", body: form });
    setLoading(false);
    e.target.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo subir la imagen");
      return;
    }
    setHasImage(true);
    router.refresh();
  }

  async function handleReset() {
    setLoading(true);
    await fetch("/api/profile/background", { method: "DELETE" });
    setLoading(false);
    setHasImage(false);
    setColor("#eef2ff");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div>
        <label className="mb-2 block text-sm font-medium">Color de fondo</label>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => applyColor(c)}
              className={`h-8 w-8 rounded-full border-2 transition ${
                !hasImage && color === c ? "border-brand-600" : "border-white"
              }`}
              style={{ backgroundColor: c, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => applyColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">O una imagen de fondo</label>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
            {hasImage ? "Cambiar imagen" : "Subir imagen"}
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={loading}>
            Restablecer por defecto
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        <p className="mt-1 text-xs text-slate-400">JPG o PNG, máximo 3MB. Reemplaza al color elegido.</p>
      </div>
    </div>
  );
}
