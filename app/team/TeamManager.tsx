"use client";

import { useState } from "react";

type TeamMemberRow = { id: string; name: string; title: string | null; createdAt: string };

export default function TeamManager({ initialTeamMembers }: { initialTeamMembers: TeamMemberRow[] }) {
  const [members, setMembers] = useState(initialTeamMembers);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, title })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo agregar");
      return;
    }
    const created = await res.json();
    setMembers((prev) => [...prev, created]);
    setShowForm(false);
    setName("");
    setTitle("");
  }

  async function handleDelete(member: TeamMemberRow) {
    if (!confirm(`¿Quitar a ${member.name} de tu equipo?`)) return;
    setError(null);
    const res = await fetch(`/api/team-members/${member.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo quitar");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  }

  function openEdit(member: TeamMemberRow) {
    setEditingMember(member);
    setEditName(member.name);
    setEditTitle(member.title || "");
    setEditError(null);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setEditLoading(true);
    setEditError(null);
    const res = await fetch(`/api/team-members/${editingMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, title: editTitle })
    });
    setEditLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || "No se pudo guardar");
      return;
    }
    const updated = await res.json();
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setEditingMember(null);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn" onClick={() => setShowForm(true)}>+ Agregar colaborador</button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {members.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Todavía no has agregado a nadie a tu equipo.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">Cargo</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 text-sm">
                  <td className="px-4 py-2.5">{m.name}</td>
                  <td className="px-4 py-2.5">{m.title || "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEdit(m)} className="text-sm text-brand-600 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(m)} className="text-sm text-red-600 hover:underline">
                        Quitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="text-lg font-semibold">Nuevo colaborador</h2>
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Cargo (opcional)</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Oficial, Ayudante"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" disabled={loading} className="btn">{loading ? "Agregando..." : "Agregar"}</button>
            </div>
          </form>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setEditingMember(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleEditSave} className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="text-lg font-semibold">Editar colaborador</h2>
            {editError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{editError}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Cargo (opcional)</label>
              <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditingMember(null)}>Cancelar</button>
              <button type="submit" disabled={editLoading} className="btn">{editLoading ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

