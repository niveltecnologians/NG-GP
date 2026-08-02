"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileForm({
  initialName,
  initialBio,
  email
}: {
  initialName: string;
  initialBio: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo guardar");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Guardado.</p>}
      <div>
        <label className="mb-1 block text-sm font-medium">Nombre</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input className="input bg-slate-50 text-slate-400" value={email} disabled />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Descripción</label>
        <textarea
          className="input"
          rows={3}
          maxLength={500}
          placeholder="Cuéntale al equipo a qué te dedicas..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      <button type="submit" disabled={loading} className="btn">
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
