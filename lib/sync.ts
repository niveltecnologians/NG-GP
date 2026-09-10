// Puente de sincronización manual con ObraFlow (el otro gestor de obras,
// hecho como un Artifact de Claude que corre solo en el navegador). No hay
// conexión en vivo entre los dos sistemas: uno genera un archivo JSON y el
// otro lo lee. Este archivo define el formato común ("obraflow-nggp-v1") y
// las conversiones necesarias en los dos sentidos.
//
// NG-GP no tiene columnas propias para varias cosas que ObraFlow sí maneja:
// cliente/dirección/estado de la obra (Project no las tiene), y hora del
// día / % de avance de una tarea (Task tampoco). En vez de agregar columnas
// nuevas a una base de datos que ya está en producción, esos datos viajan
// escondidos dentro del campo "description" como un bloque JSON al
// principio (delimitado con un comentario HTML), para que un ida-y-vuelta
// entre los dos sistemas no pierda información. `stripSyncMeta` quita ese
// bloque para mostrar la descripción real en la interfaz.

export const SYNC_FORMAT = "obraflow-nggp-v1";

const META_RE = /^<!--obraflow-meta:(.*?)-->\n?/s;

export function encodeSyncMeta(meta: Record<string, unknown>, restOfText: string | null | undefined): string {
  const cleaned = stripSyncMeta(restOfText || "");
  return `<!--obraflow-meta:${JSON.stringify(meta)}-->\n${cleaned}`;
}

export function decodeSyncMeta(text: string | null | undefined): { meta: Record<string, any>; rest: string } {
  const t = text || "";
  const m = t.match(META_RE);
  if (!m) return { meta: {}, rest: t };
  try {
    return { meta: JSON.parse(m[1]), rest: t.slice(m[0].length) };
  } catch {
    return { meta: {}, rest: t };
  }
}

export function stripSyncMeta(text: string | null | undefined): string {
  return (text || "").replace(META_RE, "");
}

export type SyncEstadoTarea = "pendiente" | "en_progreso" | "hecho";
export type SyncPrioridad = "baja" | "media" | "alta";
export type SyncEstadoObra = "planificada" | "en_curso" | "pausada" | "terminada";

// TaskStatus (NG-GP) -> estado (ObraFlow). ObraFlow solo conoce tres
// estados; IN_PROGRESS, REVIEW y las columnas del tablero administrativo
// (PROSPECTOS/DISENO/PRESUPUESTO/EJECUCION/LIQUIDACION/POSVENTA) se tratan
// todas como "en curso" desde su punto de vista.
export function taskStatusToObraFlow(status: string): SyncEstadoTarea {
  if (status === "TODO") return "pendiente";
  if (status === "DONE") return "hecho";
  return "en_progreso";
}

// estado (ObraFlow) -> TaskStatus (NG-GP). Al importar una tarea nueva se
// usa TODO/DONE/IN_PROGRESS (el tablero básico); si el proyecto de destino
// usa el modo administrativo, el usuario puede reordenarla luego a mano.
export function taskStatusFromObraFlow(estado: string): "TODO" | "IN_PROGRESS" | "DONE" {
  if (estado === "pendiente") return "TODO";
  if (estado === "hecho") return "DONE";
  return "IN_PROGRESS";
}

export function taskPriorityToObraFlow(priority: string): SyncPrioridad {
  if (priority === "LOW") return "baja";
  if (priority === "HIGH" || priority === "URGENT") return "alta";
  return "media";
}

export function taskPriorityFromObraFlow(prioridad: string): "LOW" | "MEDIUM" | "HIGH" {
  if (prioridad === "baja") return "LOW";
  if (prioridad === "alta") return "HIGH";
  return "MEDIUM";
}

export interface SyncObra {
  externalId: string;
  nombre: string;
  cliente: string;
  direccion: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

export interface SyncPersona {
  externalId: string;
  nombre: string;
  rol: string;
}

export interface SyncTarea {
  externalId: string;
  obraExternalId: string;
  obraNombre: string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
  prioridad: string;
  progreso: number;
  asignados: string[];
}

export interface SyncPayload {
  syncFormat: string;
  generatedAt: string;
  source: "obraflow" | "nggp";
  obras: SyncObra[];
  personas: SyncPersona[];
  tareas: SyncTarea[];
}

export function isValidSyncPayload(data: any): data is SyncPayload {
  return !!data && data.syncFormat === SYNC_FORMAT && Array.isArray(data.obras) && Array.isArray(data.tareas);
}
