/** Strip characters that could break or inject into Content-Disposition headers. */
export function sanitizeDownloadFilename(filename: string, fallback: string): string {
  const trimmed = filename.trim().replace(/[\r\n"\\]/g, "");
  const safe = trimmed.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 200);
  return safe.length > 0 ? safe : fallback;
}

export function contentDispositionHeader(
  filename: string,
  options?: { inline?: boolean; fallback?: string }
): string {
  const safe = sanitizeDownloadFilename(
    filename,
    options?.fallback ?? "download"
  );
  const type = options?.inline ? "inline" : "attachment";
  return `${type}; filename="${safe}"`;
}
