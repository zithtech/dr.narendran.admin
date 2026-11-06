import axios from 'axios';

interface ApiErrorBody {
  error?: unknown;
  message?: unknown;
  details?: {
    issues?: Array<{ path?: string; message?: string }>;
  };
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const issues = error.response?.data?.details?.issues;
    if (Array.isArray(issues) && issues.length > 0 && issues[0]?.message) {
      const field = issues[0]?.path ? `${issues[0].path}: ` : '';
      return `${field}${issues[0].message}`;
    }

    const apiMessage = error.response?.data?.error ?? error.response?.data?.message;

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }

    return error.message || fallback;
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
