"use client";

import { useState } from "react";

type UserRow = { id: string; name: string; email: string; role: "ADMIN" | "MEMBER"; createdAt: string };

export default function UsersManager({
  initialUsers,
  currentUserId
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo crear el usuario");
      return;
    }
    const created = await res.json();
    setUsers((prev) => [...prev, created]);
    setShowForm(false);
    setName("");
    setEmail("");
    setPassword("");
    setRole("MEMBER");
  }

  async function handleDelete(user: UserRow) {
    if (!confirm(`¿Eliminar a ${user.name} (${user.email})? Se le quitará de sus proyectos y tareas asignadas.`)) return;
    setError(null);
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo eliminar el usuario");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn" onClick={() => setShowForm(true)}>+ Nuevo usuario</button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Rol</th>
              <th className="px-4 py-2.5 font-medium">Creado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 text-sm">
                <td className="px-4 py-2.5">{u.name}</td>
                <td className="px-4 py-2.5">{u.email}</td>
                <td className="px-4 py-2.5">{u.role === "ADMIN" ? "Administrador" : "Miembro"}</td>
                <td className="px-4 py-2.5 text-xs text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString("es-ES")}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-slate-400">Tú</span>
                  ) : (
                    <button onClick={() => handleDelete(u)} className="text-sm text-red-600 hover:underline">
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="text-lg font-semibold">Nuevo usuario</h2>
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contraseña</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rol</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}>
                <option value="MEMBER">Miembro</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" disabled={loading} className="btn">{loading ? "Creando..." : "Crear"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
