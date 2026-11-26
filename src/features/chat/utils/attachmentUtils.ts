import type { AttachmentCategory } from '../types/chat';

export const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_EXTENSIONS = [
  // Images
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  // Documents
  'pdf',
  'doc',
  'docx',
  'txt',
  'rtf',
  'odt',
  // Spreadsheets
  'xls',
  'xlsx',
  'csv',
];

export const ACCEPT_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
].join(',');

/**
 * Format bytes into human-readable size (e.g. 520 B, 42.5 KB, 3.2 MB)
 */
export function formatFileSize(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Determine category of a file based on file name extension and MIME type
 */
export function getFileCategory(fileName: string, mimeType?: string | null): AttachmentCategory {
  const ext = (fileName.toLowerCase().split('.').pop() || '').trim();
  const mime = (mimeType || '').toLowerCase();

  if (
    ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return 'image';
  }

  if (ext === 'pdf' || mime.includes('pdf')) {
    return 'pdf';
  }

  if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'text/csv'
  ) {
    return 'spreadsheet';
  }

  if (
    ['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext) ||
    mime.includes('word') ||
    mime.includes('officedocument') ||
    mime.includes('text/plain')
  ) {
    return 'document';
  }

  return 'other';
}

/**
 * Check whether a file or attachment is an image
 */
export function isImageFile(fileName?: string | null, mimeType?: string | null): boolean {
  if (!fileName && !mimeType) return false;
  return getFileCategory(fileName || '', mimeType) === 'image';
}

/**
 * Validate an attachment file for size and allowed format
 */
export function validateAttachment(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds the 15 MB limit (${formatFileSize(file.size)}).`,
    };
  }

  const ext = (file.name.toLowerCase().split('.').pop() || '').trim();
  const mime = (file.type || '').toLowerCase();

  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
  const isAllowedMime =
    mime.startsWith('image/') ||
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('officedocument') ||
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    mime.includes('csv') ||
    mime.includes('text/plain');

  if (!isAllowedExt && !isAllowedMime) {
    return {
      valid: false,
      error: `File type ".${ext || 'unknown'}" is not supported. Supported types: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX, CSV.`,
    };
  }

  return { valid: true };
}
