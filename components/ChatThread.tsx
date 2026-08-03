"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { safeBlobPathname } from "@/lib/blobPath";
import ThreadPanel from "./ThreadPanel";
import GroupMembersModal from "./GroupMembersModal";
import { renderWithMentions } from "./mentions";

type Member = { id: string; name: string; hasAvatar: boolean; online: boolean };

type ConversationInfo = {
  id: string;
  isGroup: boolean;
  name: string;
  isCreator: boolean;
  otherUser: { id: string; bio: string | null; hasAvatar: boolean; online: boolean } | null;
  members: Member[];
};

type Message = {
  id: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "FILE";
  body: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  senderId: string | null;
  sender: { id: string; name: string; hasAvatar: boolean } | null;
  createdAt: string;
  editedAt: string | null;
  replyCount: number;
};

export default function ChatThread({ currentUserId, conversationId }: { currentUserId: string; conversationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("m");
  const openThreadFor = searchParams.get("thread");

  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [threadMessageId, setThreadMessageId] = useState<string | null>(openThreadFor);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (threadMessageId) return; // no autoscroll mientras hay un hilo abierto
    if (highlightId && messages.some((m) => m.id === highlightId)) {
      const el = document.getElementById(`msg-${highlightId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashId(highlightId);
      const t = setTimeout(() => setFlashId(null), 2500);
      return () => clearTimeout(t);
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  function load() {
    fetch(`/api/chat/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.messages) {
          setInfo(data);
          setMessages(data.messages);
        }
      })
      .finally(() => setLoading(false));
  }

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/chat/conversations/${conversationId}`, {
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
    try {
      const blob = await upload(safeBlobPathname(file.name), file, {
        access: "public",
        handleUploadUrl: "/api/blob/chat-file",
        clientPayload: JSON.stringify({ conversationId }),
        multipart: true
      });
      const res = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: blob.url,
          fileName: file.name,
          fileMimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          kind
        })
      });
      setSending(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo enviar el archivo");
        return;
      }
      const message = await res.json();
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      setSending(false);
      setError((err as Error).message || "No se pudo subir el archivo");
    }
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    for (const file of files) {
      const kind = file.type.startsWith("image/") ? "IMAGE" : "FILE";
      await uploadFile(file, kind);
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

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleDeleteConversation() {
    if (!confirm("¿Eliminar este chat? Se borran todos los mensajes para ambas personas. Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/chat/conversations/${conversationId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/chat");
      router.refresh();
    }
  }

  function startEdit(m: Message) {
    setEditingId(m.id);
    setEditText(m.body || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(messageId: string) {
    if (!editText.trim()) return;
    setSavingEdit(true);
    const res = await fetch(`/api/chat/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editText })
    });
    setSavingEdit(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo editar el mensaje");
      return;
    }
    const updated = await res.json();
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: updated.body, editedAt: updated.editedAt } : m)));
    setEditingId(null);
    setEditText("");
  }

  if (!info && loading) {
    return <div className="card flex h-[calc(100vh-140px)] items-center justify-center text-sm text-slate-400">Cargando...</div>;
  }
  if (!info) {
    return <div className="card flex h-[calc(100vh-140px)] items-center justify-center text-sm text-slate-400">Conversación no encontrada.</div>;
  }

  const initials = info.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const onlineMembersCount = info.members.filter((m) => m.online).length;
  const memberNames = info.members.map((m) => m.name);

  // Detecta si se está escribiendo una mención ("@algo" al final del texto).
  const mentionMatch = info.isGroup ? text.match(/@([^\s@]*)$/) : null;
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : "";
  const mentionCandidates = mentionMatch
    ? info.members.filter((m) => m.name.toLowerCase().includes(mentionQuery)).slice(0, 5)
    : [];

  function pickMention(name: string) {
    setText((prev) => prev.replace(/@([^\s@]*)$/, `@${name} `));
  }

  return (
    <div className="card flex h-[calc(100vh-140px)] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            {!info.isGroup && info.otherUser?.hasAvatar ? (
              <img src={`/api/users/${info.otherUser.id}/avatar`} alt={info.name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                  info.isGroup ? "bg-slate-200 text-slate-600" : "bg-brand-100 text-brand-700"
                }`}
              >
                {info.isGroup ? "👥" : initials}
              </div>
            )}
            {!info.isGroup && info.otherUser?.online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{info.name}</p>
            {info.isGroup ? (
              <p className="truncate text-xs text-slate-400">
                {info.members.length + 1} miembros{onlineMembersCount > 0 ? ` · ${onlineMembersCount} en línea` : ""}
              </p>
            ) : (
              <p className="truncate text-xs text-slate-400">
                {info.otherUser?.online ? "En línea" : info.otherUser?.bio || "Desconectado"}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {info.isGroup && (
            <button onClick={() => setShowMembersModal(true)} className="btn-secondary py-1.5 text-xs">
              Miembros
            </button>
          )}
          {!info.isGroup && (
            <button onClick={handleDeleteConversation} className="btn-secondary py-1.5 text-xs text-red-600">
              Eliminar chat
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Todavía no hay mensajes. ¡Saluda!</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} id={`msg-${m.id}`} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm transition ${
                    mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-900"
                  } ${flashId === m.id ? "ring-2 ring-amber-400" : ""}`}
                >
                  {info.isGroup && !mine && (
                    <p className="mb-0.5 text-[11px] font-semibold text-brand-700">{m.sender?.name || "Usuario eliminado"}</p>
                  )}
                  {m.type === "TEXT" && editingId === m.id ? (
                    <div className="space-y-2">
                      <textarea
                        className="input text-slate-900"
                        rows={2}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={cancelEdit} className="text-xs underline opacity-80">
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(m.id)}
                          disabled={savingEdit}
                          className="text-xs font-semibold underline"
                        >
                          {savingEdit ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    m.type === "TEXT" && (
                      <p className="whitespace-pre-wrap">
                        {renderWithMentions(m.body || "", memberNames)}
                        {m.editedAt && (
                          <span className={`ml-1 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>(editado)</span>
                        )}
                      </p>
                    )
                  )}
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
                <button
                  onClick={() => setThreadMessageId(m.id)}
                  className={`mt-1 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
                    m.replyCount > 0
                      ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                      : "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-600"
                  }`}
                >
                  💬 {m.replyCount > 0 ? `${m.replyCount} respuesta${m.replyCount === 1 ? "" : "s"}` : "Responder en hilo"}
                </button>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-red-600">{error}</p>}

      <form onSubmit={handleSendText} className="relative flex items-center gap-2 border-t border-slate-100 p-3">
        {mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
            {mentionCandidates.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pickMention(m.name)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                @{m.name}
              </button>
            ))}
          </div>
        )}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
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
          placeholder={info.isGroup ? "Escribe un mensaje... usa @ para mencionar" : "Escribe un mensaje..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn">
          Enviar
        </button>
      </form>

      {threadMessageId && (
        <ThreadPanel
          conversationId={conversationId}
          currentUserId={currentUserId}
          messageId={threadMessageId}
          memberNames={memberNames}
          isGroup={info.isGroup}
          onClose={() => {
            setThreadMessageId(null);
            load();
          }}
        />
      )}

      {showMembersModal && info.isGroup && (
        <GroupMembersModal
          conversationId={conversationId}
          currentUserId={currentUserId}
          isCreator={info.isCreator}
          members={info.members}
          onClose={() => {
            setShowMembersModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
