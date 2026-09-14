// Redacta con IA (Configuración → Conectar a IA) el borrador del cuerpo de
// un informe NUEVO, antes de guardarlo — es lo que usa el botón "Generar
// con IA" del formulario de nuevo informe. Si el usuario ya escribió algo
// en el cuadro "Informe", se usa como notas reales de lo que pasó (la IA
// las redacta bien, sin inventar datos distintos); si lo dejó vacío, la IA
// escribe un informe breve y genérico apropiado para esa área y ese
// avance, sin inventar cifras ni materiales concretos.
//
// A diferencia del manual de entrega, esto no tiene una versión "sin IA":
// si la llamada falla, se lanza el error para que la ruta que llama a esta
// función lo devuelva tal cual, y el usuario pueda escribir el informe él
// mismo.

import { callAi, type AiConfig } from "@/lib/ai";

export type ReportDraftInput = {
  projectName: string;
  title: string;
  areaName: string | null;
  progress: number | null;
  date: Date;
  notes: string;
};

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota"
});

function buildPrompt(input: ReportDraftInput): string {
  const datos = [
    `Título: ${input.title}`,
    `Área: ${input.areaName || "General"}`,
    `Fecha: ${DATE_FORMAT.format(input.date)}`,
    input.progress !== null ? `Avance reportado: ${input.progress}%` : null
  ]
    .filter(Boolean)
    .join("\n");

  const notesBlock = input.notes
    ? `El usuario escribió estas notas sobre lo que pasó. Tómalas como base real: redáctalas bien, ordenadas y en prosa, sin inventar datos distintos a los que aparecen acá, y sin quitar información importante:\n"""\n${input.notes}\n"""`
    : `El usuario no escribió ninguna nota. Redacta un informe breve, genérico y realista para esta área y este avance, SIN inventar cifras, cantidades, materiales ni detalles concretos que no puedas saber — usa lenguaje general (por ejemplo "se continuó con las actividades programadas para esta área").`;

  return `Eres el redactor técnico de una constructora en Colombia. Vas a escribir el texto del cuerpo de un informe de avance de obra para el proyecto "${input.projectName}".

Datos de este informe:
${datos}

${notesBlock}

Reglas:
1. Escribe en español, en prosa (sin viñetas ni encabezados), con tono profesional pero sencillo.
2. Como mucho dos párrafos cortos.
3. Responde solo con el texto del informe: sin título, sin comillas, sin comentarios tuyos ni explicaciones.`;
}

export async function generateReportDraft(input: ReportDraftInput, ai: AiConfig): Promise<string> {
  const prompt = buildPrompt(input);
  const text = await callAi(ai, prompt);
  return text.trim();
}

