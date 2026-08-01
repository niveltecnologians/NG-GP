"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddMemberForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo agregar el miembro");
      return;
    }
    setEmail("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        + Agregar miembro
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <div>
        <input
          type="email"
          placeholder="email@empresa.com"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button type="submit" disabled={loading} className="btn">
        {loading ? "..." : "Agregar"}
      </button>
      <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
        Cancelar
      </button>
    </form>
  );
}
