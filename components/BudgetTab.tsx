"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import { Task, PHASE_LABELS, PHASE_BADGE_COLORS, AREA_LABELS, AREA_BADGE_COLORS } from "@/lib/types";

const formatCOP = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default function BudgetTab({
  projectId,
  tasks,
  setTasks
}: {
  projectId: string;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
}) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const total = tasks.reduce((sum, t) => sum + (t.budget || 0), 0);
  const withBudget = tasks.filter((t) => t.budget !== null).length;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/budget-upload`, {
        method: "POST",
        body: file
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar el archivo");
      } else {
        setResult(data);
      }
    } catch {
      setError("No se pudo subir el archivo");
    }
    setUploading(false);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Presupuesto por actividad</p>
          <p className="text-xs text-slate-500">
            {withBudget} de {tasks.length} actividades tienen presupuesto cargado · Total: {formatCOP(total)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/projects/${projectId}/budget-template`} className="btn-secondary">
            Descargar plantilla Excel
          </a>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Subiendo..." : "Subir Excel"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="card border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-700">
          <p className="font-medium">
            {result.updated} actividad{result.updated === 1 ? "" : "es"} actualizada{result.updated === 1 ? "" : "s"}
            {result.skipped > 0 && `, ${result.skipped} fila${result.skipped === 1 ? "" : "s"} omitida${result.skipped === 1 ? "" : "s"}`}
            .
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <button type="button" className="btn-secondary mt-2 py-1 text-xs" onClick={() => window.location.reload()}>
            Actualizar página para ver los cambios
          </button>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2">Actividad</th>
              <th className="px-4 py-2">Fase</th>
              <th className="px-4 py-2">Área</th>
              <th className="px-4 py-2 text-right">Presupuesto</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2 text-slate-800">{t.title}</td>
                <td className="px-4 py-2">
                  {t.phase ? (
                    <span className={`badge ${PHASE_BADGE_COLORS[t.phase]}`}>{PHASE_LABELS[t.phase]}</span>
                  ) : (
                    <span className="text-xs text-slate-300">Sin fase</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {t.area ? (
                    <span className={`badge ${AREA_BADGE_COLORS[t.area]}`}>{AREA_LABELS[t.area]}</span>
                  ) : (
                    <span className="text-xs text-slate-300">Sin área</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-slate-700">
                  {t.budget !== null ? formatCOP(t.budget) : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Este proyecto todavía no tiene actividades.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Descarga la plantilla para ver exactamente cómo cargar el presupuesto de cada actividad (no cambies la
        columna "ID"), llénala en Excel y vuelve a subirla aquí — se actualiza sola.
      </p>
    </div>
  );
}
