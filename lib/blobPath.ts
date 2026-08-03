// Vercel Blob usa el nombre que le mandamos como parte de la ruta de
// almacenamiento. Nombres con tildes, "ñ", espacios o símbolos raros
// (por ejemplo "cabaña pintada~.skp") pueden hacer fallar la subida.
// Esta función arma una ruta segura (solo letras sin acentos, números,
// guiones) mientras el nombre original se sigue mostrando tal cual al
// usuario (se guarda aparte, en el campo "filename"/"fileName").
const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

export function safeBlobPathname(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const ext = dotIndex > 0 ? filename.slice(dotIndex + 1).replace(/[^a-zA-Z0-9]/g, "") : "";

  const safeBase =
    base
      .normalize("NFD")
      .replace(DIACRITICS_REGEX, "") // quita tildes/acentos (á, ñ, etc. ya separados por normalize)
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "archivo";

  return ext ? `${safeBase}.${ext}` : safeBase;
}
