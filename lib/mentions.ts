function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Dado el texto de un mensaje y la lista de miembros de la conversación,
// devuelve los ids de los usuarios que fueron mencionados con "@Nombre".
export function extractMentionedUserIds(text: string, members: { id: string; name: string }[]): string[] {
  if (!text || !text.includes("@")) return [];
  const found = new Set<string>();
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  for (const m of sorted) {
    const pattern = new RegExp(`@${escapeRegExp(m.name)}(?![\\wÀ-ÿ])`);
    if (pattern.test(text)) found.add(m.id);
  }
  return Array.from(found);
}
