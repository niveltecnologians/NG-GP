"use client";

import { useEffect, useState } from "react";

type Invite = {
  id: string;
  code: string;
  role: "ADMIN" | "MEMBER";
  usedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
  usedBy: { id: string; name: string; email: string } | null;
};

export default function InvitesManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    fetch("/api/invites")
      .then((r) => r.json())
      .then((data) => setInvites(data))
      .finally(() => setLoading(false));
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo generar el código");
      return;
    }
    const invite = await res.json();
    setInvites((prev) => [invite, ...prev]);
  }

  async function handleRevoke(id: string) {
    if (!confirm("¿Revocar este código? Ya no se podrá usar para registrarse.")) return;
    const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
    if (res.ok) setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  function handleCopy(code: string, id: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Códigos de invitación</h2>
          <p className="text-sm text-slate-500">
            Genera un código y compártelo con quien quieras invitar; lo va a pedir en la pantalla de registro.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-40" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}>
            <option value="MEMBER">Como miembro</option>
            <option value="ADMIN">Como administrador</option>
          </select>
          <button className="btn" onClick={handleCreate} disabled={creating}>
            {creating ? "Generando..." : "+ Generar código"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">Código</th>
              <th className="px-4 py-2.5 font-medium">Rol</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Creado</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">Cargando...</td></tr>
            ) : invites.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">Aún no has generado ningún código.</td></tr>
            ) : (
              invites.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 text-sm">
                  <td className="px-4 py-2.5 font-mono">{inv.code}</td>
                  <td className="px-4 py-2.5">{inv.role === "ADMIN" ? "Administrador" : "Miembro"}</td>
                  <td className="px-4 py-2.5">
                    {inv.usedAt ? (
                      <span className="text-slate-400">Usado por {inv.usedBy?.name || "—"}</span>
                    ) : (
                      <span className="font-medium text-emerald-600">Disponible</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {new Date(inv.createdAt).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!inv.usedAt && (
                      <div className="flex justify-end gap-3">
                        <button onClick={() => handleCopy(inv.code, inv.id)} className="text-sm text-brand-600 hover:underline">
                          {copiedId === inv.id ? "Copiado" : "Copiar"}
                        </button>
                        <button onClick={() => handleRevoke(inv.id)} className="text-sm text-red-600 hover:underline">
                          Revocar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
