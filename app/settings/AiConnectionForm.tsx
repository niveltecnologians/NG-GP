"use client";

import { useEffect, useState } from "react";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Claude (Anthropic)",
  openai: "ChatGPT (OpenAI)"
};

export default function AiConnectionForm() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [formProvider, setFormProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((data) => {
        setConnected(!!data.connected);
        setProvider(data.provider || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMsg(false);
    const res = await fetch("/api/settings/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: formProvider, apiKey })
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo conectar la IA");
      return;
    }
    setConnected(true);
    setProvider(formProvider);
    setApiKey("");
    setEditing(false);
    setSavedMsg(true);
  }

  async function handleDisconnect() {
    if (!confirm("¿Desconectar la IA? El manual de entrega se seguirá pudiendo generar, pero sin redacción de IA.")) return;
    setError(null);
    const res = await fetch("/api/settings/ai", { method: "DELETE" });
    if (!res.ok) {
      setError("No se pudo desconectar");
      return;
    }
    setConnected(false);
    setProvider(null);
  }

  if (loading) return null;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold">Conectar a IA</h2>
      <p className="mt-1 text-sm text-slate-500">
        Se usa para redactar el "Manual de entrega" (en Informes de obra, dentro de cada proyecto): junta
        los informes publicados de todas las áreas y la IA los convierte en un solo documento ordenado
        para el cliente. Sin conectar, el manual igual se genera, pero solo compilado, sin redacción de IA.
      </p>

      {connected && !editing && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            Conectado — {provider ? PROVIDER_LABELS[provider] || provider : ""}
          </span>
          <button className="btn-secondary" onClick={() => setEditing(true)}>
            Cambiar API key
          </button>
          <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={handleDisconnect}>
            Desconectar
          </button>
        </div>
      )}

      {savedMsg && !editing && (
        <p className="mt-3 text-sm text-emerald-600">Se conectó correctamente.</p>
      )}

      {(!connected || editing) && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium">Servicio de IA</label>
            <select className="input" value={formProvider} onChange={(e) => setFormProvider(e.target.value)}>
              <option value="anthropic">Claude (Anthropic)</option>
              <option value="openai">ChatGPT (OpenAI)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">API key</label>
            <input
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Pega aquí el API key"
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              {formProvider === "anthropic"
                ? "Se saca en console.anthropic.com (crea una cuenta ahí y carga saldo; es aparte de tu Claude normal)."
                : "Se saca en platform.openai.com (crea una cuenta ahí y carga saldo)."}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            {editing && (
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            )}
            <button type="submit" disabled={saving} className="btn">
              {saving ? "Conectando..." : "Conectar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

