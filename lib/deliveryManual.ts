// Arma el contenido del "Manual de entrega" de un proyecto: junta los
// informes de avance YA PUBLICADOS de todas las áreas en un solo texto,
// agrupado por área. Si hay una IA conectada (ver AppSettings.aiProvider/
// aiApiKey, configurada en Configuración → Conectar a IA), le pide a esa IA
// que redacte el manual de forma clara y ordenada a partir de los informes
// crudos (sacando cantidades, garantías, materiales, etc. de lo que cada
// área haya escrito). Si no hay IA conectada, o la llamada falla por
// cualquier motivo, arma el manual solo (sin IA): agrupado por área, en
// orden cronológico, tal cual quedó escrito en cada informe — así el botón
// "Generar manual de entrega" siempre funciona, con o sin IA.

export type ReportForManual = {
  areaName: string | null; // null = informe general, sin área
  title: string;
  body: string;
  reportDate: Date;
  progress: number | null;
};

export type AiConfig = { provider: string; apiKey: string } | null;

export type DeliveryManualResult = {
  content: string;
  usedAI: boolean;
  aiError: string | null;
};

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota"
});

// Agrupa los informes por área (los generales, sin área, quedan aparte al
// principio) y, dentro de cada grupo, los deja en orden cronológico (del
// más viejo al más nuevo), para que se lean como una historia de lo que se
// fue haciendo.
function groupByArea(reports: ReportForManual[]): { areaName: string; reports: ReportForManual[] }[] {
  const groups = new Map<string, ReportForManual[]>();
  for (const r of reports) {
    const key = r.areaName || "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.reportDate.getTime() - b.reportDate.getTime());
  }
  const areaNames = Array.from(groups.keys()).filter((k) => k !== "General").sort((a, b) => a.localeCompare(b));
  const orderedKeys = groups.has("General") ? ["General", ...areaNames] : areaNames;
  return orderedKeys.map((name) => ({ areaName: name, reports: groups.get(name)! }));
}

// Versión sin IA: un texto simple, agrupado por área, con la fecha y el
// avance de cada informe. Es lo que se usa si no hay IA conectada o si la
// llamada a la IA falla.
function compileWithoutAI(projectName: string, reports: ReportForManual[]): string {
  const groups = groupByArea(reports);
  const lines: string[] = [];
  lines.push(`MANUAL DE ENTREGA — ${projectName}`);
  lines.push("");
  if (groups.length === 0) {
    lines.push("Todavía no hay informes publicados en ningún área.");
    return lines.join("\n");
  }
  for (const group of groups) {
    lines.push(`## ${group.areaName}`);
    lines.push("");
    for (const r of group.reports) {
      lines.push(`${r.title} — ${DATE_FORMAT.format(r.reportDate)}${r.progress !== null ? ` (avance ${r.progress}%)` : ""}`);
      if (r.body.trim()) lines.push(r.body.trim());
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

function buildPrompt(projectName: string, reports: ReportForManual[]): string {
  const groups = groupByArea(reports);
  const raw = groups
    .map((group) => {
      const items = group.reports
        .map((r) => {
          const parts = [
            `Fecha: ${DATE_FORMAT.format(r.reportDate)}`,
            r.progress !== null ? `Avance reportado: ${r.progress}%` : null,
            `Título: ${r.title}`,
            `Texto del informe: ${r.body.trim() || "(sin texto)"}`
          ].filter(Boolean);
          return parts.join("\n");
        })
        .join("\n---\n");
      return `ÁREA: ${group.areaName}\n${items}`;
    })
    .join("\n\n====\n\n");

  return `Eres el redactor técnico de una constructora en Colombia. A continuación tienes, agrupados por área de trabajo, todos los informes de avance que cada área fue escribiendo durante la obra del proyecto "${projectName}".

Con ese material, redacta un "MANUAL DE ENTREGA" único, en español, claro y bien estructurado, que reciba el cliente final al terminar la obra. Reglas importantes:

1. Organízalo en secciones, una por cada área (usa el nombre del área como título de sección). Dentro de cada sección, redacta en prosa clara lo que esa área entregó: qué se instaló o se hizo, cantidades concretas si aparecen en los informes (tomas, salidas, metros, unidades, etc.), garantías o plazos si se mencionan, y cualquier recomendación de mantenimiento que se haya escrito. No inventes datos que no estén en los informes; si algo no se menciona, simplemente no lo incluyas.
2. No repitas los informes tal cual (no es un copiar y pegar): redáctalo como un documento de entrega formal y ordenado, fácil de leer para el cliente, pero sin quitar información importante.
3. Al principio, antes de las secciones por área, escribe un párrafo breve de resumen general de la obra.
4. Usa un tono profesional pero sencillo, sin tecnicismos innecesarios.
5. Devuelve solo el texto del manual (puedes usar títulos en mayúsculas o con "##" para las secciones), sin comentarios tuyos aparte ni explicaciones de lo que hiciste.

Informes por área:

${raw}`;
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    }),
    signal: AbortSignal.timeout(55000)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic respondió ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text || typeof text !== "string") throw new Error("Anthropic no devolvió texto");
  return text;
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-6-astra",
      messages: [{ role: "user", content: prompt }]
    }),
    signal: AbortSignal.timeout(55000)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI respondió ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error("OpenAI no devolvió texto");
  return text;
}

export async function generateDeliveryManualContent(
  projectName: string,
  reports: ReportForManual[],
  ai: AiConfig
): Promise<DeliveryManualResult> {
  if (!ai) {
    return { content: compileWithoutAI(projectName, reports), usedAI: false, aiError: null };
  }

  try {
    const prompt = buildPrompt(projectName, reports);
    const text =
      ai.provider === "openai" ? await callOpenAI(ai.apiKey, prompt) : await callAnthropic(ai.apiKey, prompt);
    return { content: text.trim(), usedAI: true, aiError: null };
  } catch (err) {
    // Si la IA falla (key inválida, sin saldo, timeout, etc.) igual se
    // entrega un manual usable, compilado sin IA, y se avisa el motivo.
    return {
      content: compileWithoutAI(projectName, reports),
      usedAI: false,
      aiError: err instanceof Error ? err.message : "No se pudo generar con IA"
    };
  }
}

