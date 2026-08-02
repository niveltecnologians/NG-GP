"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditProjectForm({
  projectId,
  initialName,
  initialDescription
}: {
  projectId: string;
  initialName: string;
  initialDescription: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo actualizar el proyecto");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Editar proyecto
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="card w-full max-w-md space-y-4 p-6">
        <h2 className="text-lg font-semibold">Editar proyecto</h2>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Descripción</label>
          <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn">
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
