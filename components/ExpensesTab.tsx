"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { safeBlobPathname } from "@/lib/blobPath";

type ExpenseType = "FACTURA" | "CUENTA_DE_COBRO" | "OTRO";

type Expense = {
  id: string;
  concept: string;
  amount: number;
  date: string;
  type: ExpenseType;
  notes: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  createdBy: { id: string; name: string } | null;
};

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const TYPE_LABEL: Record<ExpenseType, string> = {
  FACTURA: "Factura electrónica",
  CUENTA_DE_COBRO: "Cuenta de cobro",
  OTRO: "Otro comprobante"
};

function todayInput() {
  // Fecha de hoy en Colombia, en el formato que espera <input type="date">.
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota"
  });
}

export default function ExpensesTab({
  projectId,
  canManage
}: {
  projectId: string;
  canManage: boolean;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario del gasto nuevo
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [type, setType] = useState<ExpenseType>("OTRO");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const newFileInput = useRef<HTMLInputElement | null>(null);

  // Reemplazar el comprobante de un gasto ya creado
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const replaceFileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch(`/api/projects/${projectId}/expenses`)
      .then((r) => r.json())
      .then((data) => setExpenses(Array.isArray(data) ? data : []))
      .catch(() => setError("No se pudieron cargar los gastos"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const total = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  async function uploadFile(f: File): Promise<{ url: string; filename: string; mimeType: string }> {
    const blob = await upload(safeBlobPathname(f.name), f, {
      access: "public",
      handleUploadUrl: "/api/blob/expense-file",
      clientPayload: JSON.stringify({ projectId }),
      multipart: true
    });
    return { url: blob.url, filename: f.name, mimeType: f.type || "application/octet-stream" };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let uploaded: { url: string; filename: string; mimeType: string } | null = null;
    if (file) {
      try {
        uploaded = await uploadFile(file);
      } catch {
        setSaving(false);
        setError(`No se pudo subir el comprobante "${file.name}"`);
        return;
      }
    }

    const res = await fetch(`/api/projects/${projectId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        concept,
        amount,
        date,
        type,
        notes,
        fileUrl: uploaded?.url,
        fileName: uploaded?.filename,
        fileMimeType: uploaded?.mimeType
      })
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo registrar el gasto");
      return;
    }

    const created: Expense = await res.json();
    setExpenses((prev) => [created, ...prev]);
    setConcept("");
    setAmount("");
    setDate(todayInput());
    setType("OTRO");
    setNotes("");
    setFile(null);
    if (newFileInput.current) newFileInput.current.value = "";
  }

  async function handleReplaceFile(expenseId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    setReplacingId(expenseId);
    setError(null);
    try {
      const uploaded = await uploadFile(f);
      const res = await fetch(`/api/projects/${projectId}/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: uploaded.url,
          fileName: uploaded.filename,
          fileMimeType: uploaded.mimeType
        })
      });
      if (!res.ok) throw new Error();
      const updated: Expense = await res.json();
      setExpenses((prev) => prev.map((x) => (x.id === expenseId ? updated : x)));
    } catch {
      setError("No se pudo cargar el comprobante");
    } finally {
      setReplacingId(null);
    }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/projects/${projectId}/expenses/${expenseId}`, { method: "DELETE" });
    if (!res.ok) return setError("No se pudo eliminar el gasto");
    setExpenses((prev) => prev.filter((x) => x.id !== expenseId));
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando gastos...</p>;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Total gastado</p>
          <p className="text-2xl font-bold text-slate-800">{money.format(total)}</p>
        </div>
        <p className="text-xs text-slate-400">
          {expenses.length} gasto{expenses.length === 1 ? "" : "s"} registrado{expenses.length === 1 ? "" : "s"}
        </p>
      </div>

      {canManage && (
        <form onSubmit={handleCreate} className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold">Nuevo gasto</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Concepto</label>
              <input
                className="input"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Cemento para placa piso 2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valor</label>
              <input
                type="number"
                min={0}
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
              <label className="mb-1 block text-sm font-medium">Tipo de comprobante</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value as ExpenseType)}>
                <option value="FACTURA">Factura electrónica</option>
                <option value="CUENTA_DE_COBRO">Cuenta de cobro</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notas (opcional)</label>
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cualquier detalle adicional del gasto"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Adjuntar factura o cuenta de cobro (opcional)
            </label>
            <input
              ref={newFileInput}
              type="file"
              accept="application/pdf,image/*"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="mt-1 text-xs text-slate-400">
              También puedes crear el gasto sin comprobante y cargarlo después.
            </p>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn">
              {saving ? "Guardando..." : "Registrar gasto"}
            </button>
          </div>
        </form>
      )}

      {expenses.length === 0 ? (
        <p className="card p-6 text-sm text-slate-500">Todavía no hay gastos registrados en este proyecto.</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Comprobante</th>
                  {canManage && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {expense.concept}
                      {expense.notes && <p className="mt-0.5 text-xs text-slate-400">{expense.notes}</p>}
                      {expense.createdBy && (
                        <p className="mt-0.5 text-xs text-slate-400">Registró: {expense.createdBy.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{TYPE_LABEL[expense.type]}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {money.format(expense.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {expense.fileUrl ? (
                        <a
                          href={expense.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-700 underline hover:text-brand-800"
                        >
                          Ver
                        </a>
                      ) : canManage ? (
                        <>
                          <input
                            ref={(el) => {
                              replaceFileInputs.current[expense.id] = el;
                            }}
                            type="file"
                            accept="application/pdf,image/*"
                            className="hidden"
                            onChange={(e) => handleReplaceFile(expense.id, e)}
                          />
                          <button
                            className="text-slate-500 underline hover:text-slate-700"
                            disabled={replacingId === expense.id}
                            onClick={() => replaceFileInputs.current[expense.id]?.click()}
                          >
                            {replacingId === expense.id ? "Subiendo..." : "+ Cargar"}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400">Sin comprobante</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-red-600 underline hover:text-red-700"
                          onClick={() => handleDelete(expense.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{money.format(total)}</td>
                  <td className="px-4 py-3" colSpan={canManage ? 2 : 1}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

