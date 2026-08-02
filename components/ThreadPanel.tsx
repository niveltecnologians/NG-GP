"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { renderWithMentions } from "./mentions";

type Sender = { id: string; name: string; hasAvatar: boolean } | null;

type Message = {
  id: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "FILE";
  body: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  senderId: string | null;
  sender: Sender;
  createdAt: string;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageBody({ m, mine, memberNames }: { m: Message; mine: boolean; memberNames: string[] }) {
  return (
    <>
      {m.type === "TEXT" && <p className="whitespace-pre-wrap">{renderWithMentions(m.body || "", memberNames)}</p>}
      {m.type === "IMAGE" && (
        <a href={`/api/chat/messages/${m.id}`} target="_blank" rel="noreferrer">
          <img src={`/api/chat/messages/${m.id}`} alt={m.fileName || "imagen"} className="max-h-48 rounded-lg" />
        </a>
      )}
      {m.type === "AUDIO" && <audio controls src={`/api/chat/messages/${m.id}`} className="max-w-[200px]" />}
      {m.type === "FILE" && (
        <a
          href={`/api/chat/messages/${m.id}`}
          download={m.fileName || undefined}
          className={`flex items-center gap-2 underline ${mine ? "text-white" : "text-brand-700"}`}
        >
          📎 {m.fileName} <span className="text-xs opacity-75">({formatSize(m.fileSize)})</span>
        </a>
      )}
    </>
  );
}

export default function ThreadPanel({
  conversationId,
  currentUserId,
  messageId,
  memberNames,
  isGroup,
  onClose
}: {
  conversationId: string;
  currentUserId: string;
  messageId: string;
  memberNames: string[];
  isGroup: boolean;
  onClose: () => void;
}) {
  const [parent, setParent] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
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
  }, [messageId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  function load() {
    fetch(`/api/chat/conversations/${conversationId}/threads/${messageId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.parent) {
          setParent(data.parent);
          setReplies(data.replies || []);
        }
      })
      .finally(() => setLoading(false));
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/chat/conversations/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text, parentMessageId: messageId })
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo enviar la respuesta");
      return;
    }
    const message = await res.json();
    setReplies((prev) => [...prev, message]);
    setText("");
  }

  async function uploadFile(file: File, kind: "IMAGE" | "AUDIO" | "FILE") {
    setSending(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/chat-file",
        clientPayload: JSON.stringify({ conversationId })
      });
      const res = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: blob.url,
          fileName: file.name,
          fileMimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          kind,
          parentMessageId: messageId
        })
      });
      setSending(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo enviar el archivo");
        return;
      }
      const message = await res.json();
      setReplies((prev) => [...prev, message]);
    } catch (err) {
      setSending(false);
      setError((err as Error).message || "No se pudo subir el archivo");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    for (const file of files) {
      await uploadFile(file, file.type.startsWith("image/") ? "IMAGE" : "FILE");
    }
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
        uploadFile(new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" }), "AUDIO");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("No se pudo acceder al micrófono.");
    }
  }

  const mentionMatch = isGroup ? text.match(/@([^\s@]*)$/) : null;
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : "";
  const mentionCandidates = mentionMatch
    ? memberNames.filter((n) => n.toLowerCase().includes(mentionQuery)).slice(0, 5)
    : [];

  function pickMention(name: string) {
    setText((prev) => prev.replace(/@([^\s@]*)$/, `@${name} `));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/20 sm:items-stretch" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col bg-white shadow-panel sm:h-auto sm:max-h-[calc(100vh-40px)] sm:my-5 sm:mr-5 sm:rounded-xl sm:border sm:border-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Hilo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : !parent ? (
            <p className="text-sm text-slate-400">No se encontró el mensaje.</p>
          ) : (
            <>
              <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">
                <p className="mb-0.5 text-[11px] font-semibold text-brand-700">
                  {parent.sender?.name || "Usuario eliminado"}
                </p>
                <MessageBody m={parent} mine={false} memberNames={memberNames} />
                <p className="mt-1 text-[10px] text-slate-400">
                  {new Date(parent.createdAt).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <p className="mb-2 text-xs font-medium text-slate-400">
                {replies.length} respuesta{replies.length === 1 ? "" : "s"}
              </p>

              <div className="space-y-2">
                {replies.map((r) => {
                  const mine = r.senderId === currentUserId;
                  return (
                    <div key={r.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                        {!mine && <p className="mb-0.5 text-[11px] font-semibold text-brand-700">{r.sender?.name || "Usuario eliminado"}</p>}
                        <MessageBody m={r} mine={mine} memberNames={memberNames} />
                        <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                          {new Date(r.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {error && <p className="px-4 pb-1 text-xs text-red-600">{error}</p>}

        <form onSubmit={sendText} className="relative flex items-center gap-2 border-t border-slate-100 p-3">
          {mentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-3 mb-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
              {mentionCandidates.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => pickMention(name)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  @{name}
                </button>
              ))}
            </div>
          )}
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary px-2.5" disabled={sending}>
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
            placeholder="Responder en el hilo..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
          />
          <button type="submit" disabled={sending || !text.trim()} className="btn">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
