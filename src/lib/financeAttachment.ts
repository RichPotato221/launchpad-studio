export function attachmentPath(value: string): { bucket: string; path: string } | null {
  if (value.startsWith("storage://")) { const [bucket, ...parts] = value.slice(10).split("/"); return bucket && parts.length ? { bucket, path: parts.join("/") } : null; }
  try { const m = new URL(value).pathname.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)/); return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null; } catch { return null; }
}
