"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PinGate({ token, projectName }: { token: string; projectName: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/portal/${token}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo entrar");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center">
      <div className="card space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Seguimiento de obra</p>
          <h1 className="text-xl font-bold">{projectName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Escribe el PIN que te compartimos para ver el avance de tu proyecto.
          </p>
        </div>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input text-center text-lg tracking-widest"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} className="btn w-full">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
