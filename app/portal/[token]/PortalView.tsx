"use client";

import { useMemo, useState } from "react";

type PortalPhoto = { id: string; url: string; filename: string; caption: string | null };

type PortalReport = {
  id: string;
  title: string;
  body: string;
  reportDate: string;
  progress: number | null;
  photos: PortalPhoto[];
};

type BudgetItem = { id: string; concept: string; amount: number; executed: number };

type ScheduleTask = { id: string; title: string; startDate: string | null; dueDate: string | null; progress: number };

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota"
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota"
  });
}

type View = "avance" | "fotos" | "cronograma" | "presupuesto";

export default function PortalView({
  clientName,
  projectName,
  projectDescription,
  reports,
  budgetItems,
  showBudget,
  scheduleTasks,
  showSchedule
}: {
  clientName: string;
  projectName: string;
  projectDescription: string | null;
  reports: PortalReport[];
  budgetItems: BudgetItem[];
  showBudget: boolean;
  scheduleTasks: ScheduleTask[];
  showSchedule: boolean;
}) {
  const [view, setView] = useState<View>("avance");
  const [lightbox, setLightbox] = useState<PortalPhoto | null>(null);

  // El avance que se muestra arriba es el del informe más reciente que traiga
  // porcentaje (los informes vienen del servidor del más nuevo al más viejo).
  const currentProgress = useMemo(() => {
    const withProgress = reports.find((r) => r.progress !== null);
    return withProgress?.progress ?? null;
  }, [reports]);

  const allPhotos = useMemo(
    () =>
      reports.flatMap((r) =>
        r.photos.map((p) => ({ ...p, reportTitle: r.title, reportDate: r.reportDate }))
      ),
    [reports]
  );

  const totals = useMemo(() => {
    const amount = budgetItems.reduce((sum, i) => sum + i.amount, 0);
    const executed = budgetItems.reduce((sum, i) => sum + i.executed, 0);
    return { amount, executed, percent: amount > 0 ? Math.round((executed / amount) * 100) : 0 };
  }, [budgetItems]);

  const tabs: { key: View; label: string }[] = [
    { key: "avance", label: "Avance de obra" },
    { key: "fotos", label: `Registro fotográfico${allPhotos.length ? ` (${allPhotos.length})` : ""}` },
    ...(showSchedule ? [{ key: "cronograma" as View, label: "Cronograma" }] : []),
    ...(showBudget ? [{ key: "presupuesto" as View, label: "Presupuesto" }] : [])
  ];

  return (
    <div className="space-y-6">
      <header className="card p-6">
        <p className="text-xs uppercase tracking-wide text-slate-400">Seguimiento de obra</p>
        <h1 className="text-2xl font-bold">{projectName}</h1>
        {projectDescription && <p className="mt-1 text-sm text-slate-500">{projectDescription}</p>}
        <p className="mt-3 text-sm text-slate-600">Hola, {clientName}. Este es el estado de tu proyecto.</p>

        {currentProgress !== null && (
          <div className="mt-4">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium text-slate-700">Avance general</span>
              <span className="text-lg font-bold text-brand-700">{currentProgress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
              view === tab.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "avance" && (
        <div className="space-y-4">
          {reports.length === 0 && (
            <p className="card p-6 text-sm text-slate-500">
              Todavía no hay informes publicados. Apenas empiece la obra los verás acá.
            </p>
          )}

          {reports.map((report) => (
            <article key={report.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{report.title}</h2>
                <span className="text-xs text-slate-400">{formatDate(report.reportDate)}</span>
              </div>

              {report.progress !== null && (
                <span className="mt-2 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  Avance {report.progress}%
                </span>
              )}

              {report.body && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {report.body}
                </p>
              )}

              {report.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {report.photos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setLightbox(photo)}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption || photo.filename}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {view === "fotos" && (
        <div>
          {allPhotos.length === 0 ? (
            <p className="card p-6 text-sm text-slate-500">Todavía no hay fotos cargadas.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {allPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setLightbox(photo)}
                  className="card card-interactive overflow-hidden text-left"
                >
                  <div className="aspect-square overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.filename}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-slate-700">
                      {photo.caption || photo.reportTitle}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatDate(photo.reportDate)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "cronograma" && showSchedule && (
        <div className="card p-5">
          <p className="mb-4 text-sm text-slate-500">
            Actividades planeadas para tu proyecto, en orden de fecha. El porcentaje se actualiza a medida
            que el equipo va marcando cada actividad como terminada.
          </p>
          <div className="space-y-4">
            {scheduleTasks.map((task) => (
              <div key={task.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-slate-800">{task.title}</p>
                  <span className="text-xs text-slate-400">
                    {task.startDate ? formatShortDate(task.startDate) : "—"}
                    {task.dueDate && task.dueDate !== task.startDate ? ` – ${formatShortDate(task.dueDate)}` : ""}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      task.progress >= 100 ? "bg-emerald-500" : "bg-brand-500"
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "presupuesto" && showBudget && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Capítulo</th>
                  <th className="px-4 py-3 text-right">Presupuestado</th>
                  <th className="px-4 py-3 text-right">Ejecutado</th>
                  <th className="px-4 py-3 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budgetItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-700">{item.concept}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money.format(item.amount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {money.format(item.executed)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {item.amount > 0 ? Math.round((item.executed / item.amount) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money.format(totals.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money.format(totals.executed)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.percent}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption || lightbox.filename}
              className="max-h-[80vh] w-auto rounded-lg object-contain"
            />
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-sm text-white">{lightbox.caption || lightbox.filename}</p>
              <a
                href={lightbox.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm text-white/70 underline hover:text-white"
              >
                Descargar
              </a>
            </div>
          </div>
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 text-3xl leading-none text-white/80 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      <footer className="pb-8 pt-4 text-center text-xs text-slate-400">
        Este enlace es personal. Por favor no lo compartas.
      </footer>
    </div>
  );
}
