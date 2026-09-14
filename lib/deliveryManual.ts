// Arma el contenido del "Manual de entrega" de un proyecto: junta los
// informes de avance YA PUBLICADOS de todas las áreas en un solo documento,
// agrupado por área — texto Y fotos, cada sección con su propio registro
// fotográfico como evidencia de ese proceso. Si hay una IA conectada (ver
// AppSettings.aiProvider/aiApiKey, configurada en Configuración → Conectar
// a IA), le pide a esa IA que redacte el texto de cada sección de forma
// clara y ordenada a partir de los informes crudos (sacando cantidades,
// garantías, materiales, etc. de lo que cada área haya escrito). Si no hay
// IA conectada, o la llamada falla, o la IA no devuelve el formato
// esperado, se arma el manual solo (sin IA): agrupado por área, en orden
// cronológico, tal cual quedó escrito en cada informe — así el botón
// "Generar manual de entrega" siempre funciona, con o sin IA.
//
// El contenido se guarda como JSON (dentro del campo de texto de la base
// de datos) con la forma { sections: ManualSection[] }, para que la
// pantalla y el portal del cliente puedan mostrar, debajo del texto de
// cada área, las fotos de esa misma área.

export type ManualPhoto = { url: string; filename: string; caption: string | null };

export type ReportForManual = {
  areaName: string | null; // null = informe general, sin área
  title: string;
  body: string;
  reportDate: Date;
  progress: number | null;
  photos: ManualPhoto[];
};

export type ManualSection = {
  areaName: string;
  text: string;
  photos: ManualPhoto[];
};

export type AiConfig = { provider: string; apiKey: string } | null;

export type DeliveryManualResult = {
  content: string;
  usedAI: boolean;
  aiError: string | null;
};

type AreaGroup = { areaName: string; reports: ReportForManual[] };

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
function groupByArea(reports: ReportForManual[]): AreaGroup[] {
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

function normalize(s: string) {
  return s.trim().toLowerCase();
}

// Versión sin IA: un texto simple por área, con la fecha y el avance de
// cada informe, y las fotos de esa área juntas. Es lo que se usa si no hay
// IA conectada, si la llamada a la IA falla, o si la IA no devolvió el
// formato de secciones esperado.
function compileSectionsWithoutAI(groups: AreaGroup[]): ManualSection[] {
  if (groups.length === 0) {
    return [{ areaName: "General", text: "Todavía no hay informes publicados en ningún área.", photos: [] }];
  }
  return groups.map((group) => {
    const lines: string[] = [];
    for (const r of group.reports) {
      lines.push(
        `${r.title} — ${DATE_FORMAT.format(r.reportDate)}${r.progress !== null ? ` (avance ${r.progress}%)` : ""}`
      );
      if (r.body.trim()) lines.push(r.body.trim());
      lines.push("");
    }
    return {
      areaName: group.areaName,
      text: lines.join("\n").trim(),
      photos: group.reports.flatMap((r) => r.photos)
    };
  });
}

function buildPrompt(projectName: string, groups: AreaGroup[]): string {
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

  const areaList = groups.map((g) => `"${g.areaName}"`).join(", ");

  return `Eres el redactor técnico de una constructora en Colombia. A continuación tienes, agrupados por área de trabajo, todos los informes de avance que cada área fue escribiendo durante la obra del proyecto "${projectName}".

Con ese material, redacta el texto de un "MANUAL DE ENTREGA" para el cliente final, en español, claro y bien estructurado. Reglas importantes:

1. Escribe exactamente una sección por cada una de estas áreas, en este orden: ${areaList}. Cada sección debe empezar EXACTAMENTE con esta marca (respeta mayúsculas, los "#" y el nombre del área tal cual está escrito arriba, sin traducirlo ni cambiarlo):
###AREA: <nombre del área>###
Después de la marca, escribe el texto de esa sección en prosa (sin viñetas, sin usar "#" para subtítulos).
2. Dentro de cada sección, redacta claro lo que esa área entregó: qué se instaló o se hizo, cantidades concretas si aparecen en los informes (tomas, salidas, metros, unidades, etc.), garantías o plazos si se mencionan, y cualquier recomendación de mantenimiento que se haya escrito. No inventes datos que no estén en los informes; si algo no se menciona, simplemente no lo incluyas.
3. No repitas los informes tal cual (no es un copiar y pegar): redáctalo como un documento de entrega formal y ordenado, fácil de leer para el cliente, pero sin quitar información importante.
4. Usa un tono profesional pero sencillo, sin tecnicismos innecesarios.
5. No escribas nada antes de la primera marca ###AREA:...###, y no agregues comentarios tuyos ni explicaciones fuera de las secciones.

Informes por área:

${raw}`;
}

// Interpreta la respuesta de la IA (marcada con ###AREA: nombre###) y arma
// las secciones finales, cada una con las fotos de su área. Si a la IA le
// faltó alguna área o no usó el formato pedido, lanza un error — quien
// llama a esta función cae de vuelta al manual compilado sin IA.
function parseAiSections(text: string, groups: AreaGroup[]): ManualSection[] {
  const marker = /###AREA:\s*(.+?)\s*###/g;
  const matches = Array.from(text.matchAll(marker));
  if (matches.length === 0) {
    throw new Error("La IA no devolvió el formato de secciones esperado");
  }

  const found = new Map<string, string>();
  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1];
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    found.set(normalize(name), text.slice(start, end).trim());
  }

  return groups.map((group) => {
    const sectionText = found.get(normalize(group.areaName));
    if (!sectionText) {
      throw new Error(`La IA no incluyó la sección de "${group.areaName}"`);
    }
    return { areaName: group.areaName, text: sectionText, photos: group.reports.flatMap((r) => r.photos) };
  });
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
  const groups = groupByArea(reports);

  if (!ai) {
    return { content: JSON.stringify({ sections: compileSectionsWithoutAI(groups) }), usedAI: false, aiError: null };
  }

  try {
    const prompt = buildPrompt(projectName, groups);
    const text =
      ai.provider === "openai" ? await callOpenAI(ai.apiKey, prompt) : await callAnthropic(ai.apiKey, prompt);
    const sections = parseAiSections(text, groups);
    return { content: JSON.stringify({ sections }), usedAI: true, aiError: null };
  } catch (err) {
    // Si la IA falla (key inválida, sin saldo, timeout, formato raro, etc.)
    // igual se entrega un manual usable, compilado sin IA, y se avisa el
    // motivo.
    return {
      content: JSON.stringify({ sections: compileSectionsWithoutAI(groups) }),
      usedAI: false,
      aiError: err instanceof Error ? err.message : "No se pudo generar con IA"
    };
  }
}
