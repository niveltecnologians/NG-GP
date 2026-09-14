"use client";

import { useState } from "react";
import { AreaColorKey, AREA_COLOR_LABELS, AREA_COLOR_DOT, AREA_COLOR_KEYS } from "@/lib/types";

type AreaRow = {
  id: string;
  name: string;
  colorKey: AreaColorKey;
  usersCount: number;
  tasksCount: number;
};

export default function AreasManager({ initialAreas }: { initialAreas: AreaRow[] }) {
  const [areas, setAreas] = useState(initialAreas);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [colorKey, setColorKey] = useState<AreaColorKey>("slate");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [editingArea, setEditingArea] = useState<AreaRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editColorKey, setEditColorKey] = useState<AreaColorKey>("slate");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  function sortByName(list: AreaRow[]) {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, colorKey })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo crear el área");
      return;
    }
    const created = await res.json();
    setAreas((prev) => sortByName([...prev, { ...created, usersCount: 0, tasksCount: 0 }]));
    setShowForm(false);
    setName("");
    setColorKey("slate");
  }

  async function handleDelete(area: AreaRow) {
    const aviso =
      area.usersCount > 0 || area.tasksCount > 0
        ? ` ${area.usersCount} usuario(s) y ${area.tasksCount} tarea(s) se quedarán sin área asignada.`
        : "";
    if (!confirm(`¿Eliminar el área "${area.name}"?${aviso}`)) return;
    setError(null);
    const res = await fetch(`/api/areas/${area.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo eliminar el área");
      return;
    }
    setAreas((prev) => prev.filter((a) => a.id !== area.id));
  }

  function openEdit(area: AreaRow) {
    setEditingArea(area);
    setEditName(area.name);
    setEditColorKey(area.colorKey);
    setEditError(null);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingArea) return;
    setEditLoading(true);
    setEditError(null);
    const res = await fetch(`/api/areas/${editingArea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, colorKey: editColorKey })
    });
    setEditLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || "No se pudo guardar");
      return;
    }
    const updated = await res.json();
    setAreas((prev) =>
      sortByName(
        prev.map((a) => (a.id === updated.id ? { ...a, name: updated.name, colorKey: updated.colorKey } : a))
      )
    );
    setEditingArea(null);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn" onClick={() => setShowForm(true)}>+ Nueva área</button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">Área</th>
              <th className="px-4 py-2.5 font-medium">Color</th>
              <th className="px-4 py-2.5 font-medium">Usuarios</th>
              <th className="px-4 py-2.5 font-medium">Tareas</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                  Aún no has creado ninguna área.
                </td>
              </tr>
            ) : (
              areas.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 text-sm">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{a.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${AREA_COLOR_DOT[a.colorKey]}`} />
                      {AREA_COLOR_LABELS[a.colorKey] || a.colorKey}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{a.usersCount}</td>
                  <td className="px-4 py-2.5">{a.tasksCount}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEdit(a)} className="text-sm text-brand-600 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(a)} className="text-sm text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="text-lg font-semibold">Nueva área</h2>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {AREA_COLOR_KEYS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColorKey(c)}
                    title={AREA_COLOR_LABELS[c]}
                    className={`h-7 w-7 rounded-full ${AREA_COLOR_DOT[c]} ${
                      colorKey === c ? "ring-2 ring-offset-2 ring-slate-400" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn">
                {loading ? "Creando..." : "Crear"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingArea && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4" onClick={() => setEditingArea(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleEditSave} className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="text-lg font-semibold">Editar área</h2>
            {editError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{editError}</p>}
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {AREA_COLOR_KEYS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setEditColorKey(c)}
                    title={AREA_COLOR_LABELS[c]}
                    className={`h-7 w-7 rounded-full ${AREA_COLOR_DOT[c]} ${
                      editColorKey === c ? "ring-2 ring-offset-2 ring-slate-400" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditingArea(null)}>
                Cancelar
              </button>
              <button type="submit" disabled={editLoading} className="btn">
                {editLoading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

