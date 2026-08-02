"use client";

import { useEffect, useRef, useState } from "react";

type Other = { id: string; name: string; email: string; bio: string | null; hasAvatar: boolean };

type Message = {
  id: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "FILE";
  body: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  senderId: string | null;
  recipientId: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function ChatThread({ currentUserId, other }: { currentUserId: string; other: Other }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function load() {
    fetch(`/api/chat/${other.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .finally(() => setLoading(false));
  }

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/chat/${other.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text })
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo enviar el mensaje");
      return;
    }
    const message = await res.json();
    setMessages((prev) => [...prev, message]);
    setText("");
  }

  async function uploadFile(file: File, kind: "IMAGE" | "AUDIO" | "FILE") {
    setSending(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await fetch(`/api/chat/${other.id}`, { method: "POST", body: form });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo enviar el archivo");
      return;
    }
    const message = await res.json();
    setMessages((prev) => [...prev, message]);
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const kind = file.type.startsWith("image/") ? "IMAGE" : "FILE";
    uploadFile(file, kind);
  }

  async function handleToggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        uploadFile(file, "AUDIO");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
    }
  }

  const initials = other.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="card flex h-[calc(100vh-140px)] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        {other.hasAvatar ? (
          <img src={`/api/users/${other.id}/avatar`} alt={other.name} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{other.name}</p>
          {other.bio && <p className="truncate text-xs text-slate-400">{other.bio}</p>}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-sm text-slate-400">Cargando...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Todavía no hay mensajes. ¡Saluda!</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {m.type === "TEXT" && <p className="whitespace-pre-wrap">{m.body}</p>}
                  {m.type === "IMAGE" && (
                    <a href={`/api/chat/messages/${m.id}`} target="_blank" rel="noreferrer">
                      <img src={`/api/chat/messages/${m.id}`} alt={m.fileName || "imagen"} className="max-h-60 rounded-lg" />
                    </a>
                  )}
                  {m.type === "AUDIO" && (
                    <audio controls src={`/api/chat/messages/${m.id}`} className="max-w-[220px]" />
                  )}
                  {m.type === "FILE" && (
                    <a
                      href={`/api/chat/messages/${m.id}`}
                      download={m.fileName || undefined}
                      className={`flex items-center gap-2 underline ${mine ? "text-white" : "text-brand-700"}`}
                    >
                      📎 {m.fileName} <span className="text-xs opacity-75">({formatSize(m.fileSize)})</span>
                    </a>
                  )}
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-red-600">{error}</p>}

      <form onSubmit={handleSendText} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={handleAttachClick}
          className="btn-secondary px-2.5"
          title="Adjuntar archivo o imagen"
          disabled={sending}
        >
          📎
        </button>
        <button
          type="button"
          onClick={handleToggleRecording}
          className={`px-2.5 ${recording ? "btn" : "btn-secondary"}`}
          title={recording ? "Detener grabación" : "Grabar audio"}
        >
          {recording ? "⏹" : "🎤"}
        </button>
        <input
          className="input"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn">
          Enviar
        </button>
      </form>
    </div>
  );
}
