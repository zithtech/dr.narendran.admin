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
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value.trim());
  let birthYear: number;
  let birthMonth: number;
  let birthDay: number;
  if (match) {
    birthYear = parseInt(match[1]!, 10);
    birthMonth = parseInt(match[2]!, 10) - 1;
    birthDay = parseInt(match[3]!, 10);
  } else {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    birthYear = parsed.getFullYear();
    birthMonth = parsed.getMonth();
    birthDay = parsed.getDate();
  }
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  const m = now.getMonth() - birthMonth;
  if (m < 0 || (m === 0 && now.getDate() < birthDay)) age--;
  return Math.max(0, age);
}

/**
 * Formats a patient's age dynamically based on their date of birth:
 * - Under 1 month → Days (e.g. "15 days", "1 day", "0 days")
 * - 1 month to under 1 year → Months (e.g. "1 month", "2 months", "11 months")
 * - 1 year and above → Years (e.g. "1 yr", "2 yrs", "25 yrs")
 * - Missing/null/invalid DOB → "DOB not set"
 */
export function formatPatientAge(
  value: string | null | undefined,
  referenceDate = new Date()
): string {
  if (!value) return 'DOB not set';

  // Parse YYYY-MM-DD or ISO string safely in local calendar coordinates to avoid timezone shift
  let birthYear: number;
  let birthMonth: number; // 0-indexed
  let birthDay: number;

  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value.trim());
  if (match) {
    birthYear = parseInt(match[1]!, 10);
    birthMonth = parseInt(match[2]!, 10) - 1;
    birthDay = parseInt(match[3]!, 10);
  } else {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'DOB not set';
    birthYear = parsed.getFullYear();
    birthMonth = parsed.getMonth();
    birthDay = parsed.getDate();
  }

  const dob = new Date(birthYear, birthMonth, birthDay);
  if (Number.isNaN(dob.getTime())) return 'DOB not set';

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  // If DOB is in the future, avoid negative ages
  if (today.getTime() < dob.getTime()) {
    return '0 days';
  }

  // 1. Calculate completed calendar years
  let years = today.getFullYear() - birthYear;
  const currentMonthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const targetDayInCurrentMonth = Math.min(birthDay, currentMonthDays);

  const hasBirthdayOccurredThisYear =
    today.getMonth() > birthMonth ||
    (today.getMonth() === birthMonth && today.getDate() >= targetDayInCurrentMonth);

  if (!hasBirthdayOccurredThisYear) {
    years--;
  }

  if (years >= 1) {
    return years === 1 ? '1 yr' : `${years} yrs`;
  }

  // 2. Under 1 year: Calculate completed calendar months
  let months = (today.getFullYear() - birthYear) * 12 + (today.getMonth() - birthMonth);
  if (today.getDate() < targetDayInCurrentMonth) {
    months--;
  }

  if (months >= 1) {
    return months === 1 ? '1 month' : `${months} months`;
  }

  // 3. Under 1 month: Calculate elapsed calendar days
  const diffMs = today.getTime() - dob.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const safeDays = Math.max(0, days);

  return safeDays === 1 ? '1 day' : `${safeDays} days`;
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
