// Normalizes media URLs so the UI can reliably display R2 uploads.
// If an item points to a `*.r2.dev` public URL, proxy it through our API route.
export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("/")) return url;

  // Typical Cloudflare R2 public URL: https://<bucket>.<account>.r2.dev/<key>
  const match = url.match(/^https?:\/\/[^/]*\.r2\.dev\/([^?#]+)(\?[^#]+)?$/i);
  if (match) {
    const key = match[1];
    const qs = match[2] || "";
    return `/api/r2/${key}${qs}`;
  }

  return url;
}

