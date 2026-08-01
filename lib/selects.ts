// Selects reutilizables de Prisma. Excluyen a propósito el campo `data`
// (bytes) de los adjuntos: ese campo solo debe leerse en la ruta de
// descarga de un archivo puntual, nunca en listados, para no inflar
// las respuestas JSON con el contenido binario de cada archivo.
export const ATTACHMENT_LIST_SELECT = {
  id: true,
  filename: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } }
} as const;
