"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; name: string; hasAvatar: boolean; online: boolean };
type UserOption = { id: string; name: string; email: string };

export default function GroupMembersModal({
  conversationId,
  currentUserId,
  isCreator,
  members,
  onClose
}: {
  conversationId: string;
  currentUserId: string;
  isCreator: boolean;
  members: Member[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [currentMembers, setCurrentMembers] = useState(members);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users/list")
      .then((r) => r.json())
      .then((data) => setAllUsers(data))
      .catch(() => {});
  }, []);

  const memberIds = new Set([currentUserId, ...currentMembers.map((m) => m.id)]);
  const availableToAdd = allUsers.filter((u) => !memberIds.has(u.id));

  async function handleAdd() {
    if (!selectedToAdd) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/chat/conversations/${conversationId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedToAdd })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo agregar");
      return;
    }
    const added = allUsers.find((u) => u.id === selectedToAdd);
    if (added) setCurrentMembers((prev) => [...prev, { id: added.id, name: added.name, hasAvatar: false, online: false }]);
    setSelectedToAdd("");
    router.refresh();
  }

  async function handleRemove(userId: string) {
    const isSelf = userId === currentUserId;
    if (!confirm(isSelf ? "¿Salir de este grupo?" : "¿Quitar a esta persona del grupo?")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/chat/conversations/${conversationId}/members/${userId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo quitar");
      return;
    }
    if (isSelf) {
      onClose();
      router.push("/chat");
      router.refresh();
      return;
    }
    setCurrentMembers((prev) => prev.filter((m) => m.id !== userId));
    router.refresh();
  }

  async function handleDeleteGroup() {
    if (!confirm("¿Eliminar este grupo para todos los miembros? Esta acción no se puede deshacer.")) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/chat/conversations/${conversationId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo eliminar el grupo");
      return;
    }
    onClose();
    router.push("/chat");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Miembros del grupo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="max-h-48 space-y-1 overflow-y-auto">
          <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
            <span>Tú</span>
            <button onClick={() => handleRemove(currentUserId)} disabled={loading} className="text-xs text-red-600 hover:underline">
              Salir del grupo
            </button>
          </div>
          {currentMembers.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
              <span className="flex items-center gap-2">
                {m.online && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                {m.name}
              </span>
              {isCreator && (
                <button onClick={() => handleRemove(m.id)} disabled={loading} className="text-xs text-red-600 hover:underline">
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Agregar miembro</label>
          <div className="flex gap-2">
            <select className="input" value={selectedToAdd} onChange={(e) => setSelectedToAdd(e.target.value)}>
              <option value="">Selecciona...</option>
              {availableToAdd.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <button onClick={handleAdd} disabled={loading || !selectedToAdd} className="btn shrink-0">
              Agregar
            </button>
          </div>
          {availableToAdd.length === 0 && <p className="mt-1 text-xs text-slate-400">No hay más usuarios para agregar.</p>}
        </div>

        {isCreator && (
          <div className="border-t border-slate-100 pt-4">
            <button onClick={handleDeleteGroup} disabled={loading} className="text-sm text-red-600 hover:underline">
              Eliminar este grupo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
