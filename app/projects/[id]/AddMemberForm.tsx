"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserOption = { id: string; name: string; email: string };

export default function AddMemberForm({
  projectId,
  existingMemberIds
}: {
  projectId: string;
  existingMemberIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingUsers(true);
    fetch("/api/users/list")
      .then((r) => r.json())
      .then((data: UserOption[]) => setUsers(data))
      .finally(() => setLoadingUsers(false));
  }, [open]);

  const available = users.filter((u) => !existingMemberIds.includes(u.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedId })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo agregar el miembro");
      return;
    }
    setSelectedId("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        + Agregar miembro
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <h2 className="text-lg font-semibold">Agregar miembro</h2>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {loadingUsers ? (
          <p className="text-sm text-slate-400">Cargando usuarios...</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-slate-400">
            No hay usuarios disponibles para agregar. Crea uno nuevo desde "Usuarios".
          </p>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium">Usuario</label>
            <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} required>
              <option value="">Selecciona un usuario</option>
              {available.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancelar
          </button>
          <button type="submit" disabled={loading || available.length === 0} className="btn">
            {loading ? "Agregando..." : "Agregar"}
          </button>
        </div>
      </form>
    </div>
  );
}
