"use client";

import { useEffect, useState } from "react";

type ClientAccess = {
  id: string;
  name: string;
  email: string | null;
  token: string;
  active: boolean;
  showBudget: boolean;
  hasPin: boolean;
  lastVisitAt: string | null;
  createdAt: string;
};

type BudgetRow = { concept: string; amount: string; executed: string };

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

export default function ClientPortalManager({
  projectId,
  projectName
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"accesos" | "presupuesto">("accesos");
  const [accesses, setAccesses] = useState<ClientAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Formulario de acceso nuevo
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [showBudget, setShowBudget] = useState(false);
  const [creating, setCreating] = useState(false);

  // Presupuesto del cliente
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/projects/${projectId}/client-access`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/client-budget`).then((r) => r.json())
    ])
      .then(([accessData, budgetData]) => {
        setAccesses(Array.isArray(accessData) ? accessData : []);
        setRows(
          Array.isArray(budgetData) && budgetData.length > 0
            ? budgetData.map((i: any) => ({
                concept: i.concept,
                amount: String(i.amount),
                executed: String(i.executed)
              }))
            : [{ concept: "", amount: "", executed: "" }]
        );
      })
      .catch(() => setError("No se pudo cargar la información del portal"))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  function portalUrl(token: string) {
    if (typeof window === "undefined") return `/portal/${token}`;
    return `${window.location.origin}/portal/${token}`;
  }

  async function copyLink(access: ClientAccess) {
    const url = portalUrl(access.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(access.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      prompt("Copia este enlace y mándaselo al cliente:", url);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/client-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || null, pin: pin || null, showBudget })
    });

    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear el acceso");
      return;
    }

    const created: ClientAccess = await res.json();
    setAccesses((prev) => [...prev, created]);
    setName("");
    setEmail("");
    setPin("");
    setShowBudget(false);
  }

  async function patchAccess(accessId: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${projectId}/client-access/${accessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      setError("No se pudo actualizar el acceso");
      return;
    }
    const updated: ClientAccess = await res.json();
    setAccesses((prev) => prev.map((a) => (a.id === accessId ? updated : a)));
  }

  async function handleDelete(accessId: string) {
    if (!confirm("¿Eliminar este acceso? El enlace dejará de funcionar de inmediato.")) return;
    const res = await fetch(`/api/projects/${projectId}/client-access/${accessId}`, {
      method: "DELETE"
    });
    if (!res.ok) return setError("No se pudo eliminar el acceso");
    setAccesses((prev) => prev.filter((a) => a.id !== accessId));
  }

  async function handleRegenerate(accessId: string) {
    if (!confirm("Se generará un enlace nuevo y el anterior dejará de servir. ¿Continuar?")) return;
    await patchAccess(accessId, { regenerateToken: true });
  }

  async function handleChangePin(access: ClientAccess) {
    const value = prompt(
      access.hasPin
        ? "Escribe el PIN nuevo (o déjalo vacío para quitar el PIN):"
        : "Escribe el PIN que le pedirás al cliente (mínimo 4 caracteres):",
      ""
    );
    if (value === null) return;
    if (value === "") return patchAccess(access.id, { clearPin: true });
    if (value.length < 4) return setError("El PIN debe tener al menos 4 caracteres");
    await patchAccess(access.id, { pin: value });
  }

  async function saveBudget() {
    setSavingBudget(true);
    setBudgetSaved(false);
    setError(null);

    const res = await fetch(`/api/projects/${projectId}/client-budget`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: rows
          .filter((r) => r.concept.trim())
          .map((r) => ({
            concept: r.concept,
            amount: Number(r.amount) || 0,
            executed: Number(r.executed) || 0
          }))
      })
    });

    setSavingBudget(false);
    if (!res.ok) return setError("No se pudo guardar el presupuesto");
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 2500);
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalExecuted = rows.reduce((sum, r) => sum + (Number(r.executed) || 0), 0);

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Portal del cliente
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/30 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card my-8 w-full max-w-3xl space-y-4 p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Portal del cliente</h2>
            <p className="text-sm text-slate-500">{projectName}</p>
          </div>
          <button className="text-2xl leading-none text-slate-400 hover:text-slate-600" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex gap-1 border-b border-slate-200">
          {[
            { key: "accesos" as const, label: "Accesos" },
            { key: "presupuesto" as const, label: "Presupuesto del cliente" }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-slate-400">Cargando...</p>}

        {!loading && tab === "accesos" && (
          <div className="space-y-4">
            <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold">Añadir usuario cliente</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nombre del cliente</label>
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Familia Restrepo"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Correo (opcional)</label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="solo de referencia"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">PIN (opcional)</label>
                  <input
                    className="input"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Si lo dejas vacío, con el enlace basta para entrar.
                  </p>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={showBudget}
                      onChange={(e) => setShowBudget(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Mostrarle el presupuesto
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={creating} className="btn">
                  {creating ? "Creando..." : "Crear acceso"}
                </button>
              </div>
            </form>

            {accesses.length === 0 ? (
              <p className="text-sm text-slate-400">
                Todavía no hay clientes con acceso a este proyecto.
              </p>
            ) : (
              <div className="space-y-3">
                {accesses.map((access) => (
                  <div key={access.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {access.name}
                          {!access.active && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                              Desactivado
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
                          {access.email || "Sin correo"}
                          {access.hasPin ? " · Con PIN" : " · Sin PIN"}
                          {access.lastVisitAt
                            ? ` · Última visita: ${new Date(access.lastVisitAt).toLocaleDateString("es-CO", {
                                timeZone: "America/Bogota"
                              })}`
                            : " · Todavía no ha entrado"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <input
                        readOnly
                        value={portalUrl(access.token)}
                        onFocus={(e) => e.currentTarget.select()}
                        className="input flex-1 bg-slate-50 text-xs"
                      />
                      <button className="btn shrink-0" onClick={() => copyLink(access)}>
                        {copied === access.id ? "¡Copiado!" : "Copiar"}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex items-center gap-2 text-slate-600">
                        <input
                          type="checkbox"
                          checked={access.showBudget}
                          onChange={(e) => patchAccess(access.id, { showBudget: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                        Ver presupuesto
                      </label>
                      <label className="flex items-center gap-2 text-slate-600">
                        <input
                          type="checkbox"
                          checked={access.active}
                          onChange={(e) => patchAccess(access.id, { active: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                        Activo
                      </label>
                      <button
                        className="text-slate-500 underline hover:text-slate-700"
                        onClick={() => handleChangePin(access)}
                      >
                        {access.hasPin ? "Cambiar PIN" : "Poner PIN"}
                      </button>
                      <button
                        className="text-slate-500 underline hover:text-slate-700"
                        onClick={() => handleRegenerate(access.id)}
                      >
                        Regenerar enlace
                      </button>
                      <button
                        className="text-red-600 underline hover:text-red-700"
                        onClick={() => handleDelete(access.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && tab === "presupuesto" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Este es el presupuesto que ve el cliente en su portal, aparte del presupuesto interno
              por tarea. Si lo dejas vacío, al cliente no le aparece la pestaña.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2">Capítulo</th>
                    <th className="pb-2 w-40">Presupuestado</th>
                    <th className="pb-2 w-40">Ejecutado</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      <td className="py-1 pr-2">
                        <input
                          className="input"
                          value={row.concept}
                          placeholder="Ej: Redes hidrosanitarias"
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, concept: e.target.value } : r))
                            )
                          }
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          className="input"
                          value={row.amount}
                          placeholder="0"
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, amount: e.target.value } : r))
                            )
                          }
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          className="input"
                          value={row.executed}
                          placeholder="0"
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === index ? { ...r, executed: e.target.value } : r))
                            )
                          }
                        />
                      </td>
                      <td className="py-1">
                        <button
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                          title="Quitar fila"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              className="btn-secondary"
              onClick={() => setRows((prev) => [...prev, { concept: "", amount: "", executed: "" }])}
            >
              + Agregar fila
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <p className="text-sm text-slate-600">
                Total: <strong>{money.format(total)}</strong> · Ejecutado:{" "}
                <strong>{money.format(totalExecuted)}</strong>
              </p>
              <div className="flex items-center gap-3">
                {budgetSaved && <span className="text-sm text-emerald-600">Guardado</span>}
                <button className="btn" disabled={savingBudget} onClick={saveBudget}>
                  {savingBudget ? "Guardando..." : "Guardar presupuesto"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
