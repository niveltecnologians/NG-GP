"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserOption = { id: string; name: string; email: string };

export default function NewConversationModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users/list")
      .then((r) => r.json())
      .then((data) => setUsers(data))
      .finally(() => setLoadingUsers(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (selected.length === 0) {
      setError("Selecciona al menos una persona");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: selected, name: selected.length > 1 ? groupName : undefined })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear la conversación");
      return;
    }
    const conv = await res.json();
    onClose();
    router.push(`/chat/${conv.id}`);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm space-y-4 p-6">
        <h2 className="text-lg font-semibold">Nueva conversación</h2>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium">Con quién</label>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
            {loadingUsers ? (
              <p className="p-3 text-sm text-slate-400">Cargando...</p>
            ) : users.length === 0 ? (
              <p className="p-3 text-sm text-slate-400">No hay otros usuarios registrados.</p>
            ) : (
              users.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50">
                  <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
                  <span>
                    {u.name} <span className="text-xs text-slate-400">({u.email})</span>
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Elige una persona para un chat directo, o varias para crear un grupo.
          </p>
        </div>

        {selected.length > 1 && (
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre del grupo (opcional)</label>
            <input className="input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej. Equipo de diseño" />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" onClick={handleCreate} disabled={loading} className="btn">
            {loading ? "Creando..." : selected.length > 1 ? "Crear grupo" : "Iniciar chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
