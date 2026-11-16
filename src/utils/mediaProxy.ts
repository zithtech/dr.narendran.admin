/**
 * Resolves an image URL through the backend media proxy.
 *
 * If the image is a blob URL or data URL (local preview during file upload),
 * it is returned directly since it is in-memory in the browser.
 *
 * For external or AWS S3 URLs, it routes through `/api/proxy/image?url=...`
 * to bypass CORS and private S3 403 AccessDenied errors, streaming the image
 * directly from the backend.
 */
export function getMediaProxyUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return '';
  }

  const trimmed = url.trim();

  // Blob and data URLs are client-side in-memory previews created in the browser
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // If already proxied, do not double-proxy
  if (trimmed.includes('/proxy/image')) {
    return trimmed;
  }

  // Get base API URL (e.g. 'http://localhost:4000/api' or '/api')
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
  const cleanBase = apiBase.replace(/\/+$/, '');

  return `${cleanBase}/proxy/image?url=${encodeURIComponent(trimmed)}`;
}

