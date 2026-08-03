"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; name: string; email: string };

export default function ProjectMembersList({
  projectId,
  ownerId,
  currentUserId,
  members
}: {
  projectId: string;
  ownerId: string;
  currentUserId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRemove(userId: string) {
    if (!confirm("¿Quitar a esta persona del proyecto?")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo quitar");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Miembros
      </button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Miembros del proyecto</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                  <span className="truncate">
                    {m.name} <span className="text-xs text-slate-400">({m.email})</span>
                    {m.id === ownerId && <span className="ml-1 text-xs text-brand-600">· dueño</span>}
                  </span>
                  {m.id !== ownerId && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={loading}
                      className="shrink-0 text-xs text-red-600 hover:underline"
                    >
                      {m.id === currentUserId ? "Salir" : "Quitar"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
