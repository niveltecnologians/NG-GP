"use client";

import { useEffect, useState } from "react";

type Manual = { content: string; usedAI: boolean; updatedAt: string } | null;

// Panel de "Manual de entrega": junta los informes publicados de todas las
// áreas de este proyecto en un solo documento (el mismo que ve el cliente
// en su portal). Cualquier miembro del proyecto puede verlo una vez existe;
// solo quien administra el proyecto completo (dueño, administrador o
// gerente) puede generarlo o volver a generarlo.
export default function DeliveryManualPanel({
  projectId,
  canGenerate
}: {
  projectId: string;
  canGenerate: boolean;
}) {
  const [manual, setManual] = useState<Manual>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/delivery-manual`)
      .then((r) => r.json())
      .then((data) => setManual(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleGenerate() {
    if (
      !confirm(
        "¿Generar el manual de entrega con los informes publicados de todas las áreas? Si ya existe uno, se reemplaza."
      )
    )
      return;
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/delivery-manual`, { method: "POST" });
    setGenerating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo generar el manual de entrega");
      return;
    }
    const data = await res.json();
    setManual(data);
    setOpen(true);
    if (data.aiError) {
      setError(`Se generó el manual sin IA porque falló la conexión con la IA: ${data.aiError}`);
    }
  }

  if (loading) return null;
  if (!manual && !canGenerate) return null;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Manual de entrega</h2>
          <p className="text-sm text-slate-500">
            Junta los informes publicados de todas las áreas en un solo documento — el mismo que ve el
            cliente en su portal, completo, sin importar el área.
          </p>
        </div>
        {canGenerate && (
          <button className="btn" disabled={generating} onClick={handleGenerate}>
            {generating ? "Generando..." : manual ? "Generar de nuevo" : "Generar manual de entrega"}
          </button>
        )}
      </div>

      {error && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{error}</p>}

      {manual && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                manual.usedAI ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {manual.usedAI ? "Redactado con IA" : "Compilado automáticamente"}
            </span>
            <span>
              Actualizado{" "}
              {new Date(manual.updatedAt).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "America/Bogota"
              })}
            </span>
            <button className="ml-auto text-brand-600 hover:underline" onClick={() => setOpen((v) => !v)}>
              {open ? "Ocultar" : "Ver manual completo"}
            </button>
          </div>
          {open && (
            <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {manual.content}
            </div>
          )}
        </div>
      )}

      {!manual && canGenerate && (
        <p className="mt-3 text-sm text-slate-400">
          Todavía no se ha generado ningún manual de entrega para este proyecto.
        </p>
      )}
    </div>
  );
}

