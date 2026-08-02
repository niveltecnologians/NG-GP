"use client";

import { useState } from "react";

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "No se pudo cambiar la contraseña");
      return;
    }
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Contraseña actualizada.</p>}
      <div>
        <label className="mb-1 block text-sm font-medium">Contraseña actual</label>
        <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Contraseña nueva</label>
        <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Confirmar contraseña nueva</label>
        <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
      </div>
      <button type="submit" disabled={loading} className="btn">
        {loading ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
