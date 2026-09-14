// Funciones compartidas para llamar a la IA conectada (Configuración →
// Conectar a IA, guardada en AppSettings.aiProvider/aiApiKey). Las usa
// tanto la redacción del manual de entrega (lib/deliveryManual.ts) como la
// redacción del borrador de un informe nuevo (lib/reportDraft.ts).

export type AiConfig = { provider: string; apiKey: string };

export async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
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

export async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
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

// Llama al proveedor que esté conectado (Anthropic u OpenAI) con el mismo
// prompt de texto plano.
export async function callAi(ai: AiConfig, prompt: string): Promise<string> {
  return ai.provider === "openai" ? callOpenAI(ai.apiKey, prompt) : callAnthropic(ai.apiKey, prompt);
}

