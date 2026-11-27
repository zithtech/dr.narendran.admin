import femaleImg from '../assets/femaleimg.png';
import maleImg from '../assets/maleimg.png';
import api from './api';

export { femaleImg, maleImg };

/**
 * Determines whether a doctor is female based on gender field, titles, or name patterns.
 */
export function isFemaleDoctor(
  doctor?: { name?: string | null; gender?: string | null } | null,
): boolean {
  if (!doctor) return false;

  // 1. Explicit gender field
  const g = doctor.gender?.toString().trim().toUpperCase();
  if (g === 'FEMALE') return true;
  if (g === 'MALE') return false;

  // 2. Salutation / prefix checks in doctor name
  const name = doctor.name?.trim() || '';
  if (/\b(mrs|ms|miss|smt)\b/i.test(name)) {
    return true;
  }

  // 3. Common female first names / components in healthcare
  const femalePattern =
    /\b(bharathi|kavitha|priya|shanti|lakshmi|meera|revathi|deepa|swathi|divya|pooja|sneha|malathi|gayathri|anitha|sunita|geetha|radhika|preethi|nisha|rekha|anita|ananya|aarthi|shilpa|mary|sarah|emily|jessica|jennifer|laura|lisa|rachel|maria|aishwarya|anuradha|bhavani|chitra|durga|harini|indira|jaya|kamala|kalyani|lalitha|madhavi|nandini|padma|pavithra|radha|sandhya|sarada|saranya|shobha|sowmya|sudha|sumathi|tara|uma|usha|vanitha|varalakshmi|vasantha|vidya|vijaya|yamuna)\b/i;

  return femalePattern.test(name);
}

/**
 * Returns the API origin (protocol + host + port) when configured with an absolute URL,
 * or empty string when relative (e.g. in local Vite dev proxy).
 */
export function getApiOrigin(): string {
  const raw =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    api?.defaults?.baseURL ||
    '';

  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.origin;
    } catch {
      return trimmed.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
    }
  }

  return '';
}

/**
 * Ensures an API endpoint path (like /api/proxy/image) resolves against the absolute
 * API host origin when running in production/live environments.
 */
export function toApiUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const origin = getApiOrigin();
  return origin ? `${origin}${cleanPath}` : cleanPath;
}

/**
 * Resolves an image URL, routing unsigned AWS S3 URLs or proxied storage endpoints
 * through the live backend API proxy, avoiding 403 Forbidden, CORS, and cross-origin issues.
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed.includes('@')) {
    return null;
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  // Normalize absolute localhost backend URLs to relative /uploads or /api paths so dev server proxies them
  const normalizedUrl = trimmed.replace(/^https?:\/\/localhost:\d+\/(uploads|api|branding)\//i, '/$1/');

  // If already proxied, ensure full API origin if relative
  if (normalizedUrl.startsWith('/api/proxy/image') || normalizedUrl.startsWith('api/proxy/image')) {
    const normalized = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
    return toApiUrl(normalized);
  }
  // Convert legacy storage URLs to proxy endpoint
  if (normalizedUrl.startsWith('/api/medical-records/storage/') || normalizedUrl.startsWith('/api/staff/storage/')) {
    const rawKey = normalizedUrl.replace(/^\/api\/[a-z0-9_-]+\/storage\//i, '');
    return toApiUrl(`/api/proxy/image?key=${encodeURIComponent(decodeURIComponent(rawKey))}`);
  }
  // Route unsigned S3 URLs through image proxy to avoid CORS or 403 AccessDenied
  if (normalizedUrl.includes('amazonaws.com') && !normalizedUrl.includes('X-Amz-Signature')) {
    return toApiUrl(`/api/proxy/image?url=${encodeURIComponent(normalizedUrl)}`);
  }
  // If starts with /api/, /uploads/, or /branding/, resolve against API origin
  if (normalizedUrl.startsWith('/api/') || normalizedUrl.startsWith('/uploads/') || normalizedUrl.startsWith('/branding/')) {
    return toApiUrl(normalizedUrl);
  }
  // Bare storage keys without leading slash (e.g. 'uploads/prescription_templates/...', 'branding/...', etc.)
  if (
    normalizedUrl.startsWith('uploads/') ||
    normalizedUrl.startsWith('branding/') ||
    normalizedUrl.startsWith('prescriptions/') ||
    normalizedUrl.startsWith('doctors/')
  ) {
    return toApiUrl(`/api/proxy/image?key=${encodeURIComponent(normalizedUrl)}`);
  }
  return normalizedUrl;
}

/**
 * Returns maleimg or femaleimg based on doctor profile.
 */
export function getDoctorDefaultAvatar(
  doctor?: { name?: string | null; gender?: string | null } | null,
): string {
  return isFemaleDoctor(doctor) ? femaleImg : maleImg;
}
