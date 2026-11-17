/**
 * Helpers for authenticating and resolving media/document file URLs.
 */

/**
 * Retrieves the active authentication token from localStorage.
 */
export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';

  const isClientContext =
    window.location.pathname.startsWith('/portal') ||
    window.location.pathname.startsWith('/client');
  const clientToken =
    localStorage.getItem('labClientToken') ||
    localStorage.getItem('clientPortalToken');
  const adminToken = localStorage.getItem('adminToken');
  const masterToken = localStorage.getItem('hms_master_token');

  // Check any tenant token if present
  let tenantToken = '';
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('tenant_') && key.endsWith('_token')) {
      tenantToken = localStorage.getItem(key) || '';
      break;
    }
  }

  if (isClientContext) {
    return clientToken || adminToken || masterToken || tenantToken || '';
  }
  return adminToken || clientToken || masterToken || tenantToken || '';
}

/**
 * Returns an authenticated URL with the active token in the query params if needed.
 * This is crucial for direct browser navigations (window.open, <a href>, <iframe>, <img>)
 * accessing protected endpoints like /api/medical-records/:id/file where custom
 * Authorization headers cannot be passed by the browser.
 */
export function getAuthenticatedFileUrl(rawUrl?: string | null, download?: boolean): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return '';
  const trimmed = rawUrl.trim();

  // If this is a data or blob URL, return as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If external non-API URL (e.g. S3 presigned URL with signature), return as-is
  if (
    (trimmed.startsWith('http://') || trimmed.startsWith('https://')) &&
    !trimmed.includes('/api/medical-records') &&
    !trimmed.includes('/api/prescriptions') &&
    !trimmed.includes('/api/staff')
  ) {
    return trimmed;
  }

  const token = getAuthToken();
  if (!token) {
    // Even without token, if download is requested, attach download=true
    if (download && !trimmed.includes('download=')) {
      const sep = trimmed.includes('?') ? '&' : '?';
      return `${trimmed}${sep}download=true`;
    }
    return trimmed;
  }

  try {
    const isFullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const base = isFullUrl
      ? undefined
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:5173';
    const parsed = new URL(trimmed, base);

    if (!parsed.searchParams.has('token')) {
      parsed.searchParams.set('token', token);
    }
    if (download && !parsed.searchParams.has('download')) {
      parsed.searchParams.set('download', 'true');
    }

    if (isFullUrl) {
      return parsed.toString();
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    const sep = trimmed.includes('?') ? '&' : '?';
    let res = trimmed;
    if (!res.includes('token=')) {
      res = `${res}${sep}token=${encodeURIComponent(token)}`;
    }
    if (download && !res.includes('download=')) {
      res = `${res}&download=true`;
    }
    return res;
  }
}
