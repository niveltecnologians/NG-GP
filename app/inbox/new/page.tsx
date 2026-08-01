"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTicketPage() {
  const router = useRouter();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, recipientEmail })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo enviar el requerimiento");
      return;
    }
    const ticket = await res.json();
    router.push(`/inbox/${ticket.id}`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-bold">Nuevo requerimiento</h1>
      <p className="mb-6 text-sm text-slate-500">Envíalo a un compañero como si fuera un correo, con trazabilidad de respuestas.</p>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium">Para (email)</label>
          <input type="email" className="input" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Asunto</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Mensaje</label>
          <textarea className="input" rows={6} value={body} onChange={(e) => setBody(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancelar</button>
          <button type="submit" disabled={loading} className="btn">{loading ? "Enviando..." : "Enviar"}</button>
        </div>
      </form>
    </div>
  );
}
