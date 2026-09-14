// Genera y descarga un documento de Word (.doc) armado a partir de HTML.
// Word abre sin problema un archivo HTML guardado con extensión .doc — es
// el mismo truco que usa Office desde hace años — así que no hace falta
// ninguna librería aparte para producir archivos de Word de verdad,
// totalmente editables.
export function downloadWordDoc(filename: string, title: string, bodyHtml: string) {
  const html =
    "<!DOCTYPE html>" +
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    "<head>" +
    '<meta charset="utf-8">' +
    `<title>${escapeHtml(title)}</title>` +
    "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->" +
    "<style>" +
    "body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; color: #1f2937; }" +
    "h1 { font-size: 18pt; margin-bottom: 4pt; }" +
    ".meta { color: #6b7280; font-size: 10pt; margin-bottom: 14pt; }" +
    "p { white-space: pre-wrap; line-height: 1.4; }" +
    "img { max-width: 480px; display: block; margin: 10pt 0; }" +
    ".caption { color: #6b7280; font-size: 9pt; margin-top: -6pt; margin-bottom: 10pt; }" +
    "</style>" +
    "</head>" +
    `<body>${bodyHtml}</body>` +
    "</html>";

  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Descarga una imagen y la convierte a data URI (base64), para poder
// incrustarla directamente dentro del archivo de Word desde el momento en
// que se descarga. Así el documento no depende de internet ni de que la
// foto siga existiendo en NG-GP cuando alguien lo abra más adelante. Si
// una foto puntual no se puede descargar (por ejemplo, sin internet en
// este momento), se deja como enlace en vez de romper toda la descarga.
export async function imageUrlToDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string) {
  const base = name.replace(/[\\/:*?"<>|]+/g, "").trim() || "documento";
  return base.endsWith(".doc") ? base : `${base}.doc`;
}
