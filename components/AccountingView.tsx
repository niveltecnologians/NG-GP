"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ExpenseType,
  ExpenseAccountingStatus,
  ExpenseComment,
  EXPENSE_TYPE_LABELS,
  EXPENSE_ACCOUNTING_STATUS_LABELS,
  EXPENSE_ACCOUNTING_STATUS_COLORS
} from "@/lib/types";

type Expense = {
  id: string;
  projectId: string;
  project: { id: string; name: string };
  concept: string;
  amount: number;
  date: string;
  type: ExpenseType;
  notes: string | null;
  providerName: string | null;
  invoiceNumber: string | null;
  fileUrl: string | null;
  accountingStatus: ExpenseAccountingStatus;
  comments: ExpenseComment[];
  createdBy: { id: string; name: string } | null;
};

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota"
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota"
  });
}

const STATUS_FILTERS: { value: ExpenseAccountingStatus | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos los estados" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "CAUSADO", label: "Causado" },
  { value: "NO_CAUSADO", label: "No causado" }
];

export default function AccountingView({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ExpenseAccountingStatus | "TODOS">("TODOS");
  const [projectFilter, setProjectFilter] = useState<string>("TODOS");
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<string | null>(null);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    expenses.forEach((e) => map.set(e.project.id, e.project.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (statusFilter !== "TODOS" && e.accountingStatus !== statusFilter) return false;
      if (projectFilter !== "TODOS" && e.projectId !== projectFilter) return false;
      return true;
    });
  }, [expenses, statusFilter, projectFilter]);

  const totals = useMemo(() => {
    const byStatus: Record<ExpenseAccountingStatus, number> = { PENDIENTE: 0, CAUSADO: 0, NO_CAUSADO: 0 };
    let total = 0;
    filtered.forEach((e) => {
      byStatus[e.accountingStatus] += e.amount;
      total += e.amount;
    });
    return { byStatus, total };
  }, [filtered]);

  async function handleStatusChange(expense: Expense, accountingStatus: ExpenseAccountingStatus) {
    setSavingStatusId(expense.id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${expense.projectId}/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountingStatus })
      });
      if (!res.ok) throw new Error();
      const updated: Expense = await res.json();
      setExpenses((prev) => prev.map((x) => (x.id === expense.id ? { ...x, ...updated } : x)));
    } catch {
      setError("No se pudo actualizar el estado del gasto");
    } finally {
      setSavingStatusId(null);
    }
  }

  async function handleAddComment(expense: Expense) {
    const content = (commentDrafts[expense.id] || "").trim();
    if (!content) return;
    setPostingComment(expense.id);
    try {
      const res = await fetch(`/api/projects/${expense.projectId}/expenses/${expense.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error();
      const comment: ExpenseComment = await res.json();
      setExpenses((prev) =>
        prev.map((x) => (x.id === expense.id ? { ...x, comments: [...x.comments, comment] } : x))
      );
      setCommentDrafts((prev) => ({ ...prev, [expense.id]: "" }));
    } catch {
      setError("No se pudo enviar el comentario");
    } finally {
      setPostingComment(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total filtrado</p>
          <p className="text-xl font-bold text-slate-800">{money.format(totals.total)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pendiente</p>
          <p className="text-xl font-bold text-slate-600">{money.format(totals.byStatus.PENDIENTE)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Causado</p>
          <p className="text-xl font-bold text-emerald-600">{money.format(totals.byStatus.CAUSADO)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">No causado</p>
          <p className="text-xl font-bold text-red-600">{money.format(totals.byStatus.NO_CAUSADO)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="input w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ExpenseAccountingStatus | "TODOS")}>
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select className="input w-56" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="TODOS">Todos los proyectos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="card p-6 text-sm text-slate-500">No hay gastos que coincidan con este filtro.</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Proyecto</th>
                  <th className="px-4 py-3">Proveedor / concepto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((expense) => (
                  <Fragment key={expense.id}>
                    <tr>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(expense.date)}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{expense.project.name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-medium">{expense.providerName || "—"}</p>
                        <p className="text-slate-600">{expense.concept}</p>
                        {expense.invoiceNumber && (
                          <p className="mt-0.5 text-xs text-slate-400">Factura N° {expense.invoiceNumber}</p>
                        )}
                        {expense.createdBy && (
                          <p className="mt-0.5 text-xs text-slate-400">Registró: {expense.createdBy.name}</p>
                        )}
                        <button
                          className="mt-1 text-xs text-brand-600 underline hover:text-brand-800"
                          onClick={() => setOpenCommentsId(openCommentsId === expense.id ? null : expense.id)}
                        >
                          {expense.comments.length > 0
                            ? `Comentarios (${expense.comments.length})`
                            : "Comentarios"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {EXPENSE_TYPE_LABELS[expense.type]}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {money.format(expense.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          className={`rounded-md border-0 px-2 py-1 text-xs font-medium ${EXPENSE_ACCOUNTING_STATUS_COLORS[expense.accountingStatus]}`}
                          value={expense.accountingStatus}
                          disabled={savingStatusId === expense.id}
                          onChange={(e) => handleStatusChange(expense, e.target.value as ExpenseAccountingStatus)}
                        >
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="CAUSADO">Causado</option>
                          <option value="NO_CAUSADO">No causado</option>
                        </select>
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
                        ) : (
                          <span className="text-slate-400">Sin comprobante</span>
                        )}
                      </td>
                    </tr>
                    {openCommentsId === expense.id && (
                      <tr>
                        <td colSpan={7} className="bg-slate-50 px-4 py-3">
                          <div className="space-y-2">
                            {expense.comments.length === 0 ? (
                              <p className="text-xs text-slate-400">
                                Todavía no hay comentarios en este gasto.
                              </p>
                            ) : (
                              expense.comments.map((c) => (
                                <div key={c.id} className="rounded-md bg-white px-3 py-2 text-sm shadow-sm">
                                  <p className="text-slate-700">{c.content}</p>
                                  <p className="mt-0.5 text-xs text-slate-400">
                                    {c.author?.name || "—"} · {formatDateTime(c.createdAt)}
                                  </p>
                                </div>
                              ))
                            )}
                            <div className="flex gap-2">
                              <input
                                className="input"
                                placeholder="Pregúntale algo al encargado de la obra..."
                                value={commentDrafts[expense.id] || ""}
                                onChange={(e) =>
                                  setCommentDrafts((prev) => ({ ...prev, [expense.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddComment(expense);
                                }}
                              />
                              <button
                                className="btn-secondary"
                                disabled={postingComment === expense.id}
                                onClick={() => handleAddComment(expense)}
                              >
                                {postingComment === expense.id ? "Enviando..." : "Enviar"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

