function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Convierte un texto plano en nodos de React, resaltando las menciones
// "@Nombre" que coincidan con algún miembro de la conversación.
export function renderWithMentions(text: string, memberNames: string[]) {
  if (memberNames.length === 0 || !text.includes("@")) return text;
  const escaped = [...memberNames].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const pattern = new RegExp(`@(${escaped.join("|")})`, "g");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="rounded bg-brand-100 px-1 font-semibold text-brand-700">
        @{part}
      </span>
    ) : (
      part
    )
  );
}
