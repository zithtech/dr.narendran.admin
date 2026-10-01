/** Display helpers shared by every admin table. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "20 minutes ago", "3 days ago", then a plain date past a month. */
export function timeAgo(value: string | null | undefined, now = Date.now()): string {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '—';

  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), 'minute') + ' ago';
  if (diff < DAY) return plural(Math.floor(diff / HOUR), 'hour') + ' ago';
  if (diff < 30 * DAY) return plural(Math.floor(diff / DAY), 'day') + ' ago';
  return formatDate(value);
}

/** Age of a record as "3 months" / "2 years, 1 month", or `fresh` under a month. */
export function tenure(value: string | null | undefined, fresh = 'New'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  if (months < 1) return fresh;

  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return plural(rest, 'month');
  if (rest === 0) return plural(years, 'year');
  return `${plural(years, 'year')}, ${plural(rest, 'month')}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ageFrom(value: string | null | undefined): number | null {
  if (!value) return null;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** "ACTIVE" → "Active", "not_set" → "Not set". */
export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  const lower = value.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function initials(name: string): string {
  const cleaned = name
    .replace(/^(dr|mr|mrs|ms|miss|prof)\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = cleaned[0]?.[0] ?? '?';
  const last = cleaned.length > 1 ? (cleaned[cleaned.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const AVATAR_TONES = [
  { bg: '#e8f0fe', fg: '#1f63e0' },
  { bg: '#e7f6ee', fg: '#15803d' },
  { bg: '#fdf0e6', fg: '#c2410c' },
  { bg: '#f1ecfe', fg: '#6d28d9' },
  { bg: '#fde8ef', fg: '#be185d' },
  { bg: '#e6f6f8', fg: '#0e7490' },
  { bg: '#fef6e0', fg: '#a16207' },
] as const;

/** Stable colour per name so a person keeps the same avatar across screens. */
export function toneFor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length] ?? AVATAR_TONES[0];
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** "2026-09" bucket key for grouping records by the month they were created. */
export function monthKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-09" → "Sep 2026". */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}
