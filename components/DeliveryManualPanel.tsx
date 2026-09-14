"use client";

import { useEffect, useState } from "react";
import { downloadWordDoc, escapeHtml, imageUrlToDataUri } from "@/lib/wordExport";

type Manual = { content: string; usedAI: boolean; updatedAt: string } | null;

type ManualPhoto = { url: string; filename: string; caption: string | null };
type ManualSection = { areaName: string; text: string; photos: ManualPhoto[] };

// El contenido se guarda como JSON ({ sections: [...] }), una sección por
// área con su texto y sus fotos. Si viene de un manual generado antes de
// este cambio (texto plano), se muestra como una sola sección "General".
function parseManualSections(content: string): ManualSection[] {
  try {
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.sections)) return parsed.sections;
  } catch {
    // Manual generado antes de este cambio: era texto plano.
  }
  return [{ areaName: "General", text: content, photos: [] }];
}

// Panel de "Manual de entrega": junta los informes publicados de todas las
// áreas de este proyecto en un solo documento, sección por área con su
// texto y su registro fotográfico (el mismo que ve el cliente en su
// portal). Cualquier miembro del proyecto puede verlo y descargarlo una
// vez existe; solo quien administra el proyecto completo (dueño,
// administrador o gerente) puede generarlo, volver a generarlo o borrarlo.
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
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  async function handleDelete() {
    if (
      !confirm(
        "¿Borrar el manual de entrega? El cliente dejará de verlo en su portal hasta que generes uno nuevo."
      )
    )
      return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/delivery-manual`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setError("No se pudo borrar el manual de entrega");
      return;
    }
    setManual(null);
    setOpen(false);
  }

  // Descarga el manual completo como Word: una sección por área, con su
  // texto y sus fotos incrustadas dentro del archivo (no dependen de
  // internet cuando alguien lo abra más tarde). Como hay que descargar
  // todas las fotos de todas las áreas, puede tomar varios segundos.
  async function handleExportWord() {
    if (!manual) return;
    setExporting(true);
    setError(null);
    try {
      const updated = new Date(manual.updatedAt).toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/Bogota"
      });
      let html = "<h1>Manual de entrega</h1>" + `<p class="meta">Actualizado ${escapeHtml(updated)}</p>`;

      for (const section of parseManualSections(manual.content)) {
        html += `<h2>${escapeHtml(section.areaName)}</h2>`;
        html += `<p>${escapeHtml(section.text).replace(/\n/g, "<br>")}</p>`;
        for (const photo of section.photos) {
          const dataUri = await imageUrlToDataUri(photo.url);
          html += `<img src="${dataUri || photo.url}" alt="${escapeHtml(photo.caption || photo.filename)}">`;
          if (photo.caption) html += `<p class="caption">${escapeHtml(photo.caption)}</p>`;
        }
      }

      downloadWordDoc("Manual de entrega", "Manual de entrega", html);
    } finally {
      setExporting(false);
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
            Junta los informes publicados de todas las áreas en un solo documento, con el texto y las fotos
            de cada área — el mismo que ve el cliente en su portal, completo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {manual && (
            <button className="btn-secondary" disabled={exporting} onClick={handleExportWord}>
              {exporting ? "Preparando..." : "Descargar Word"}
            </button>
          )}
          {canGenerate && manual && (
            <button
              className="btn-secondary text-red-600 hover:bg-red-50"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Borrando..." : "Borrar manual"}
            </button>
          )}
          {canGenerate && (
            <button className="btn" disabled={generating} onClick={handleGenerate}>
              {generating ? "Generando..." : manual ? "Generar de nuevo" : "Generar manual de entrega"}
            </button>
          )}
        </div>
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
            <div className="max-h-[32rem] space-y-5 overflow-y-auto rounded-lg bg-slate-50 p-4">
              {parseManualSections(manual.content).map((section, i) => (
                <div key={i}>
                  <h3 className="text-sm font-semibold text-slate-800">{section.areaName}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {section.text}
                  </p>
                  {section.photos.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {section.photos.map((photo, j) => (
                        <a
                          key={j}
                          href={photo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded bg-slate-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.caption || photo.filename}
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
