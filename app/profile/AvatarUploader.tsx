"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AvatarUploader({
  userId,
  initialHasAvatar,
  name
}: {
  userId: string;
  initialHasAvatar: boolean;
  name: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasAvatar, setHasAvatar] = useState(initialHasAvatar);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: form });
    setLoading(false);
    e.target.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo subir la imagen");
      return;
    }
    setHasAvatar(true);
    setVersion((v) => v + 1);
    router.refresh();
  }

  async function handleRemove() {
    setLoading(true);
    await fetch("/api/profile/avatar", { method: "DELETE" });
    setLoading(false);
    setHasAvatar(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      {hasAvatar ? (
        <img
          src={`/api/users/${userId}/avatar?v=${version}`}
          alt={name}
          className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow-card"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
          {initials}
        </div>
      )}
      <div>
        {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
            {loading ? "Subiendo..." : hasAvatar ? "Cambiar foto" : "Subir foto"}
          </button>
          {hasAvatar && (
            <button type="button" className="btn-secondary" onClick={handleRemove} disabled={loading}>
              Quitar
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <p className="mt-1 text-xs text-slate-400">JPG o PNG, máximo 3MB.</p>
      </div>
    </div>
  );
}
