"use client";

import { useRef, useState } from "react";

interface ImportResult {
  ok: boolean;
  obrasCreadas: number;
  obrasActualizadas: number;
  tareasCreadas: number;
  tareasActualizadas: number;
  tareasOmitidas: number;
  personasSinCuenta: string[];
}

export default function SyncManager() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NGGP_sync_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setError("El archivo no es un JSON válido");
        return;
      }
      const res = await fetch("/api/sync/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo importar el archivo");
        return;
      }
      setResult(data);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h2 className="font-semibold">1. Exportar desde NG-GP</h2>
        <p className="mt-1 text-sm text-slate-500">
          Descarga un archivo con todos los proyectos y tareas de NG-GP, listo para subir en ObraFlow (menú
          Exportar → Importar JSON de NG-GP).
        </p>
        <button className="btn mt-3" onClick={handleExport} disabled={exporting}>
          {exporting ? "Generando…" : "Descargar JSON para ObraFlow"}
        </button>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">2. Importar desde ObraFlow</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sube el archivo que ObraFlow generó con su menú Exportar → Exportar JSON para NG-GP. Las obras y tareas
          que ya existan (mismo nombre) se actualizan; las que no existan se crean.
        </p>
        <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFileChosen} />
        <button className="btn-secondary mt-3" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? "Importando…" : "Subir JSON de ObraFlow"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="card space-y-2 p-5 text-sm">
          <h3 className="font-semibold">Resultado de la importación</h3>
          <p>
            Obras: {result.obrasCreadas} nueva(s), {result.obrasActualizadas} actualizada(s)
          </p>
          <p>
            Tareas: {result.tareasCreadas} nueva(s), {result.tareasActualizadas} actualizada(s)
            {result.tareasOmitidas ? `, ${result.tareasOmitidas} omitida(s) por no encontrar su obra` : ""}
          </p>
          {result.personasSinCuenta.length > 0 && (
            <p className="text-amber-700">
              Sin cuenta en NG-GP (quedaron sin asignar, pero su nombre se anotó en la descripción de cada tarea):{" "}
              {result.personasSinCuenta.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
