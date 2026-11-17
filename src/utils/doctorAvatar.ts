import femaleImg from '../assets/femaleimg.png';
import maleImg from '../assets/maleimg.png';

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
 * Resolves an image URL, routing unsigned AWS S3 URLs through /api/proxy/image
 * to avoid 403 Forbidden errors when accessing private buckets.
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed.includes('@')) {
    return null;
  }
  // If already proxied, keep as is
  if (trimmed.startsWith('/api/proxy/image')) {
    return trimmed;
  }
  // Convert legacy storage URLs to proxy endpoint
  if (trimmed.startsWith('/api/medical-records/storage/') || trimmed.startsWith('/api/staff/storage/')) {
    const rawKey = trimmed.replace(/^\/api\/[a-z0-9_-]+\/storage\//i, '');
    return `/api/proxy/image?key=${encodeURIComponent(decodeURIComponent(rawKey))}`;
  }
  // Route unsigned S3 URLs through image proxy to avoid CORS or 403 AccessDenied
  if (trimmed.includes('amazonaws.com') && !trimmed.includes('X-Amz-Signature')) {
    return `/api/proxy/image?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

/**
 * Returns maleimg or femaleimg based on doctor profile.
 */
export function getDoctorDefaultAvatar(
  doctor?: { name?: string | null; gender?: string | null } | null,
): string {
  return isFemaleDoctor(doctor) ? femaleImg : maleImg;
}
