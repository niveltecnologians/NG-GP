"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { safeBlobPathname } from "@/lib/blobPath";

type Photo = { id: string; url: string; filename: string; caption: string | null; order: number };

type Report = {
  id: string;
  title: string;
  body: string;
  reportDate: string;
  progress: number | null;
  status: "DRAFT" | "PUBLISHED";
  author: { id: string; name: string } | null;
  photos: Photo[];
};

function todayInput() {
  // Fecha de hoy en Colombia, en el formato que espera <input type="date">.
  const now = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return now;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota"
  });
}

export default function ReportsTab({
  projectId,
  canManage
}: {
  projectId: string;
  canManage: boolean;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario del informe nuevo
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(todayInput());
  const [progress, setProgress] = useState("");
  const [publish, setPublish] = useState(true);
  const [saving, setSaving] = useState(false);

  // Subida de fotos
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch(`/api/projects/${projectId}/reports`)
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudieron cargar los informes"))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Sugiere el título siguiente: si ya hay 3 informes, propone el 04.
  const suggestedTitle = useMemo(() => {
    const n = String(reports.length + 1).padStart(2, "0");
    return `Registro fotográfico ${n}`;
  }, [reports.length]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || suggestedTitle,
        body,
        reportDate: date,
        progress: progress === "" ? null : progress,
        status: publish ? "PUBLISHED" : "DRAFT"
      })
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear el informe");
      return;
    }

    const created: Report = await res.json();
    setReports((prev) => [created, ...prev]);
    setTitle("");
    setBody("");
    setProgress("");
    setDate(todayInput());
  }

  // Carga masiva: se escogen varias fotos de una vez y se suben una tras otra
  // directo a Vercel Blob; al final se registran todas juntas en el informe.
  async function handlePhotos(reportId: string, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    e.target.value = "";

    setUploadingTo(reportId);
    setUploadProgress({ done: 0, total: files.length });
    setError(null);

    const uploaded: { url: string; filename: string }[] = [];

    for (const file of files) {
      try {
        const blob = await upload(safeBlobPathname(file.name), file, {
          access: "public",
          handleUploadUrl: "/api/blob/report-photo",
          clientPayload: JSON.stringify({ reportId }),
          multipart: true
        });
        uploaded.push({ url: blob.url, filename: file.name });
      } catch {
        setError(`No se pudo subir "${file.name}". Las demás sí se subieron.`);
      }
      setUploadProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    if (uploaded.length > 0) {
      const res = await fetch(`/api/projects/${projectId}/reports/${reportId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: uploaded })
      });
      if (res.ok) {
        const created: Photo[] = await res.json();
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, photos: [...r.photos, ...created] } : r))
        );
      } else {
        setError("Las fotos se subieron pero no se pudieron guardar en el informe.");
      }
    }

    setUploadingTo(null);
    setUploadProgress({ done: 0, total: 0 });
  }

  async function handleDeletePhoto(reportId: string, photoId: string) {
    if (!confirm("¿Borrar esta foto del informe?")) return;
    const res = await fetch(`/api/report-photos/${photoId}`, { method: "DELETE" });
    if (!res.ok) return setError("No se pudo borrar la foto");
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, photos: r.photos.filter((p) => p.id !== photoId) } : r))
    );
  }

  async function handleCaption(reportId: string, photo: Photo) {
    const caption = prompt("Descripción de la foto:", photo.caption || "");
    if (caption === null) return;
    const res = await fetch(`/api/report-photos/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption })
    });
    if (!res.ok) return setError("No se pudo guardar la descripción");
    const updated: Photo = await res.json();
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, photos: r.photos.map((p) => (p.id === photo.id ? updated : p)) }
          : r
      )
    );
  }

  async function togglePublish(report: Report) {
    const next = report.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const res = await fetch(`/api/projects/${projectId}/reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next })
    });
    if (!res.ok) return setError("No se pudo cambiar el estado del informe");
    const updated: Report = await res.json();
    setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)));
  }

  async function handleDeleteReport(reportId: string) {
    if (!confirm("¿Borrar este informe con todas sus fotos? No se puede deshacer.")) return;
    const res = await fetch(`/api/projects/${projectId}/reports/${reportId}`, { method: "DELETE" });
    if (!res.ok) return setError("No se pudo borrar el informe");
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando informes...</p>;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {canManage && (
        <form onSubmit={handleCreate} className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold">Nuevo informe del día</h2>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div>
              <label className="mb-1 block text-sm font-medium">Título</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={suggestedTitle}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Avance %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input w-24"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                placeholder="—"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Informe</label>
            <textarea
              className="input min-h-[120px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe o pega acá el informe del día. Ej: Hoy se desarrolló el contrato de tubería en el piso 2..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="rounded border-slate-300"
              />
              Publicar de una vez al portal del cliente
            </label>
            <button type="submit" disabled={saving} className="btn">
              {saving ? "Guardando..." : "Crear informe"}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Después de crearlo puedes cargarle las fotos, todas de una vez.
          </p>
        </form>
      )}

      {reports.length === 0 && (
        <p className="card p-6 text-sm text-slate-500">
          Todavía no hay informes en este proyecto.
        </p>
      )}

      {reports.map((report) => (
        <article key={report.id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{report.title}</h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    report.status === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {report.status === "PUBLISHED" ? "Publicado" : "Borrador"}
                </span>
                {report.progress !== null && (
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    Avance {report.progress}%
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {formatDate(report.reportDate)}
                {report.author && ` · ${report.author.name}`}
                {` · ${report.photos.length} foto${report.photos.length === 1 ? "" : "s"}`}
              </p>
            </div>

            {canManage && (
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => togglePublish(report)}>
                  {report.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                </button>
                <button
                  className="btn-secondary text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteReport(report.id)}
                >
                  Borrar
                </button>
              </div>
            )}
          </div>

          {report.body && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {report.body}
            </p>
          )}

          {canManage && (
            <div className="mt-4">
              <input
                ref={(el) => {
                  fileInputs.current[report.id] = el;
                }}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePhotos(report.id, e)}
              />
              <button
                className="btn-secondary"
                disabled={uploadingTo !== null}
                onClick={() => fileInputs.current[report.id]?.click()}
              >
                {uploadingTo === report.id
                  ? `Subiendo ${uploadProgress.done}/${uploadProgress.total}...`
                  : "+ Cargar fotos"}
              </button>
            </div>
          )}

          {report.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {report.photos.map((photo) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-lg bg-slate-100">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.filename}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                  {photo.caption && (
                    <p className="truncate bg-white px-2 py-1 text-[11px] text-slate-600">
                      {photo.caption}
                    </p>
                  )}
                  {canManage && (
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => handleCaption(report.id, photo)}
                        className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white hover:bg-black/80"
                        title="Editar descripción"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(report.id, photo.id)}
                        className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white hover:bg-red-600"
                        title="Borrar foto"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
